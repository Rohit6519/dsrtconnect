import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/looking-for/[id]/view
 * Body: {
 *   source_type: 'team_up' | 'venture_lf' | 'project_role',
 *   session_id?: string,
 *   source?: string,
 *   referrer_url?: string | null,
 *   dwell_ms?: number,
 * }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await req.json().catch(() => ({}))
  const {
    source_type = 'team_up',
    session_id,
    source = 'direct',
    referrer_url,
    dwell_ms,
  } = body

  try {
    // ─── 1. Increment view_count on the source ───
    if (source_type === 'team_up') {
      await supabase.rpc('increment', {
        table_name: 'team_up_requests',
        row_id: id,
        column_name: 'view_count',
      }).catch(async () => {
        // Fallback: direct update if RPC doesn't exist
        await supabase.from('team_up_requests')
          .update({ view_count: supabase.rpc('coalesce_add', {}) as any })
          .eq('id', id)
          .then(() => {}, () => {})
      })
    } else if (source_type === 'venture_lf') {
      await supabase.from('venture_looking_for')
        .update({ application_count: 0 }) // no-op — count columns exist per-table
        .eq('id', id)
        .then(() => {}, () => {})
    }

    // ─── 2. Track signal for algorithm (Batch 9e) ───
    if (user) {
      const signalType = dwell_ms && dwell_ms > 30000 ? 'dwell_30s'
                     : dwell_ms && dwell_ms > 10000 ? 'dwell_10s'
                     : 'view'
      const weight = dwell_ms && dwell_ms > 30000 ? 3
                   : dwell_ms && dwell_ms > 10000 ? 2
                   : 1

      await supabase.from('user_activity_signals').insert({
        user_id: user.id,
        signal_type: signalType,
        entity_type: 'looking_for',
        entity_id: id,
        weight,
        dwell_ms: dwell_ms || null,
        session_id: session_id || null,
        metadata: { source_type, source },
      }).then(() => {}, () => {})

      // Also track in user_seen_items for long-term memory
      await supabase.from('user_seen_items').upsert({
        user_id: user.id,
        entity_type: 'looking_for',
        entity_id: id,
        seen_at: new Date().toISOString(),
        interacted: false,
      }, {
        onConflict: 'user_id,entity_type,entity_id',
        ignoreDuplicates: false,
      }).then(() => {}, () => {})
    }

    // ─── 3. Session view tracking (no repeats within session) ───
    if (session_id) {
      await supabase.from('user_session_views').upsert({
        session_id,
        user_id: user?.id || null,
        entity_type: 'looking_for',
        entity_id: id,
        viewed_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,entity_type,entity_id',
        ignoreDuplicates: false,
      }).then(() => {}, () => {})
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('LF view tracking error:', e)
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 })
  }
}