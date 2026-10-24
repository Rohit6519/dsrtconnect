import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent, writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = ['active', 'paused', 'closed', 'filled', 'archived']

/**
 * PATCH /api/opportunities/bulk
 * body: { ids: string[], action: 'pause'|'resume'|'close'|'archive'|'delete'|'set_status', status?: string }
 * Owner-only across all ids.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  const action: string = String(body.action || '')
  if (ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  if (ids.length > 100) return NextResponse.json({ error: 'Too many ids' }, { status: 400 })

  try {
    // Verify ownership of every id
    const { data: owned } = await supabase
      .from('opportunities')
      .select('id, status')
      .in('id', ids)
      .eq('poster_user_id', user.id)

    const ownedMap = new Map((owned || []).map((o: any) => [o.id, o]))
    const ownedIds = ids.filter(id => ownedMap.has(id))
    if (ownedIds.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let updated = 0
    let deleted = 0

    if (action === 'delete') {
      const { error, count } = await supabase
        .from('opportunities')
        .delete({ count: 'exact' })
        .in('id', ownedIds)
      if (error) throw error
      deleted = count || 0

      // Audit (best-effort)
      for (const id of ownedIds) {
        await writeOpportunityAudit({
          opportunity_id: id,
          actor_id: user.id,
          action: 'opportunity_deleted',
          target_type: 'opportunity',
          target_id: id,
          before_state: { status: ownedMap.get(id)?.status },
          reason: 'bulk_delete',
        }).catch(() => {})
      }

      return NextResponse.json({ ok: true, deleted })
    }

    let nextStatus: string | null = null
    if (action === 'pause') nextStatus = 'paused'
    else if (action === 'resume') nextStatus = 'active'
    else if (action === 'close') nextStatus = 'closed'
    else if (action === 'archive') nextStatus = 'archived'
    else if (action === 'set_status') {
      if (!ALLOWED_STATUSES.includes(String(body.status))) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      nextStatus = String(body.status)
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const patch: any = {
      status: nextStatus,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (nextStatus === 'active') {
      // First-time publish sets published_at
      // We'll only set it where it's null
      const { data: needsPublish } = await supabase
        .from('opportunities')
        .select('id')
        .in('id', ownedIds)
        .is('published_at', null)
      const publishIds = (needsPublish || []).map((r: any) => r.id)
      if (publishIds.length > 0) {
        await supabase
          .from('opportunities')
          .update({ published_at: new Date().toISOString() })
          .in('id', publishIds)
      }
    }

    const { data: rows, error } = await supabase
      .from('opportunities')
      .update(patch)
      .in('id', ownedIds)
      .select('id, status')
    if (error) throw error
    updated = rows?.length || 0

    // Events + audit
    const eventMap: Record<string, string> = {
      paused: 'opportunity_paused',
      active: 'opportunity_resumed',
      closed: 'opportunity_closed',
      archived: 'opportunity_closed',
    }
    for (const id of ownedIds) {
      const before = ownedMap.get(id)?.status
      await writeOpportunityAudit({
        opportunity_id: id,
        actor_id: user.id,
        action: `opportunity_${nextStatus}`,
        target_type: 'opportunity',
        target_id: id,
        before_state: { status: before },
        after_state: { status: nextStatus },
        reason: 'bulk',
      }).catch(() => {})
      const evt = eventMap[nextStatus!]
      if (evt) {
        await trackOpportunityEvent({
          opportunity_id: id,
          user_id: user.id,
          event_type: evt as any,
          source: 'portfolio_bulk',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ ok: true, updated, skipped: ids.length - ownedIds.length })
  } catch (e: any) {
    console.error('Bulk action error:', e)
    return NextResponse.json({ error: e?.message || 'Bulk failed' }, { status: 500 })
  }
}