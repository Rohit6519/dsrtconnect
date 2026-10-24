import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SESSION_DEDUP_MINUTES = 30

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const body = await request.json().catch(() => ({}))
    const source = (body.source || 'direct') as string
    const referrer = body.referrer_url || null
    const deviceType = body.device_type || null
    const sessionId = body.session_id || (user ? 'u:' + user.id : 'anon')
    const dwellMs = typeof body.dwell_ms === 'number' ? body.dwell_ms : null

    // Fetch venture (id + owner)
    const { data: venture, error: vErr } = await supabase
      .from('ventures')
      .select('id, founder_id, user_id, view_count')
      .eq('slug', slug)
      .single()

    if (vErr || !venture) {
      return NextResponse.json({ ok: false, error: 'Venture not found' }, { status: 404 })
    }

    const isOwner = !!(user && (user.id === venture.founder_id || user.id === venture.user_id))
    const viewerId = user?.id || null

    // Session dedup — don't insert same session_id within last 30 min
    const cutoff = new Date(Date.now() - SESSION_DEDUP_MINUTES * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('venture_views')
      .select('id')
      .eq('venture_id', venture.id)
      .eq('session_id', sessionId)
      .gte('created_at', cutoff)
      .limit(1)
      .maybeSingle()

    if (recent) {
      return NextResponse.json({ ok: true, tracked: false, reason: 'session-dedup' })
    }

    // Insert view row
    const { error: insertErr } = await supabase
      .from('venture_views')
      .insert({
        venture_id: venture.id,
        viewer_id: viewerId,
        source,
        session_id: sessionId,
        dwell_ms: dwellMs,
        is_owner: isOwner,
      })

    if (insertErr) {
      console.error('View insert failed:', insertErr)
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 })
    }

    // Increment counter (denormalized for fast card display)
    await supabase
      .from('ventures')
      .update({ view_count: (venture.view_count || 0) + 1 })
      .eq('id', venture.id)
      .then(() => {}, () => {})

    // Update daily analytics row (upsert today)
    const today = new Date().toISOString().slice(0, 10)
    await supabase.rpc('increment_venture_view_analytics', {
      p_venture_id: venture.id,
      p_date: today,
      p_source: source,
    }).then(() => {}, () => {
      // Fallback if RPC doesn't exist — direct upsert
      supabase.from('venture_analytics').upsert({
        venture_id: venture.id,
        date: today,
        views: 1,
        unique_views: viewerId ? 1 : 0,
      }, { onConflict: 'venture_id,date' }).then(() => {}, () => {})
    })

    return NextResponse.json({ ok: true, tracked: true, isOwner })
  } catch (e: any) {
    console.error('View tracking error:', e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}