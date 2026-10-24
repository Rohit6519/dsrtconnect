import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Signal weight map (single source of truth) ───
const SIGNAL_WEIGHTS: Record<string, number> = {
  view: 1,
  view_card: 1,
  dwell_10s: 2,
  dwell_30s: 3,
  scroll_50: 1,
  click: 2,
  click_through: 2,
  save: 6,
  unsave: -2,
  follow: 8,
  unfollow: -2,
  connect_sent: 10,
  apply_submitted: 12,
  dismiss: -10,
  hide_forever: -50,
  category_added: 3,
  community_added: 3,
  share: 4,
}

/**
 * POST /api/explore/track
 * Body: {
 *   action: string,             // signal_type
 *   entity_type: 'project' | 'venture' | 'looking_for',
 *   entity_id: string,          // UUID
 *   session_id?: string,        // for no-repeat tracking
 *   dwell_ms?: number,          // dwell time in ms
 *   scroll_position?: number,   // position in feed
 *   metadata?: object,          // extra context
 * }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const body = await request.json()
    const {
      action,
      entity_type,
      entity_id,
      session_id,
      dwell_ms,
      scroll_position,
      metadata = {},
    } = body

    if (!action || !entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'action, entity_type, entity_id required' },
        { status: 400 }
      )
    }

    if (!['project', 'venture', 'looking_for', 'project_role', 'venture_role'].includes(entity_type)) {
      return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
    }

    const weight = SIGNAL_WEIGHTS[action] ?? 1

    // ═══ 1. Write to user_activity_signals ═══
    if (user) {
      await supabase
        .from('user_activity_signals')
        .insert({
          user_id: user.id,
          signal_type: action,
          entity_type,
          entity_id,
          weight,
          dwell_ms: dwell_ms || null,
          session_id: session_id || null,
          metadata,
        })
        .then(() => {}, (e) => console.error('Signal insert failed:', e))
    }

    // ═══ 2. Update session views (for no-repeat) ═══
    if (session_id && ['view', 'view_card', 'click'].includes(action)) {
      await supabase
        .from('user_session_views')
        .upsert({
          session_id,
          user_id: user?.id || null,
          entity_type,
          entity_id,
          viewed_at: new Date().toISOString(),
          scroll_position: scroll_position || 0,
        }, {
          onConflict: 'session_id,entity_type,entity_id',
          ignoreDuplicates: false,
        })
        .then(() => {}, () => {})
    }

    // ═══ 3. Update user_seen_items (long-term memory) ═══
    if (user && ['view', 'click', 'click_through', 'save', 'follow'].includes(action)) {
      await supabase
        .from('user_seen_items')
        .upsert({
          user_id: user.id,
          entity_type,
          entity_id,
          seen_at: new Date().toISOString(),
          interacted: ['click', 'click_through', 'save', 'follow'].includes(action),
        }, {
          onConflict: 'user_id,entity_type,entity_id',
          ignoreDuplicates: false,
        })
        .then(() => {}, () => {})
    }

    // ═══ 4. Handle dismiss ═══
    if (user && action === 'dismiss') {
      if (entity_type === 'venture') {
        await supabase
          .from('user_dismissed_ventures')
          .upsert({
            user_id: user.id,
            venture_id: entity_id,
            dismissed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,venture_id' })
          .then(() => {}, () => {})
      }
      // (project dismissal handled through user_activity_signals)

      // Invalidate cache to hide immediately
      await supabase
        .from(entity_type === 'venture' ? 'venture_recommendations_cache' : 'project_recommendations_cache')
        .delete()
        .eq('user_id', user.id)
        .eq(entity_type === 'venture' ? 'venture_id' : 'project_id', entity_id)
        .then(() => {}, () => {})
    }

    // ═══ 5. Handle save ═══
    if (user && action === 'save') {
      if (entity_type === 'venture') {
        await supabase
          .from('venture_saves')
          .upsert({
            user_id: user.id,
            venture_id: entity_id,
            saved_at: new Date().toISOString(),
          }, { onConflict: 'user_id,venture_id' })
          .then(() => {}, () => {})
      } else if (entity_type === 'project') {
        await supabase
          .from('project_saves')
          .upsert({
            user_id: user.id,
            project_id: entity_id,
            saved_at: new Date().toISOString(),
          }, { onConflict: 'user_id,project_id' })
          .then(() => {}, () => {})
      }
    }

    // ═══ 6. Handle unsave ═══
    if (user && action === 'unsave') {
      if (entity_type === 'venture') {
        await supabase
          .from('venture_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('venture_id', entity_id)
          .then(() => {}, () => {})
      } else if (entity_type === 'project') {
        await supabase
          .from('project_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', entity_id)
          .then(() => {}, () => {})
      }
    }

    return NextResponse.json({ success: true, weight })
  } catch (e: any) {
    console.error('Track error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}