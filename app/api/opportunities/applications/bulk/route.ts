import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'
import type { PipelineStage } from '@/lib/applications/types'

export const dynamic = 'force-dynamic'

const VALID_STAGES: PipelineStage[] = [
  'applied', 'submitted', 'pending', 'reviewing', 'screening',
  'interviewing', 'offered', 'hired', 'rejected', 'withdrawn',
]

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.application_ids) ? body.application_ids.filter(Boolean) : []
  const action: string = String(body.action || '')

  if (ids.length === 0) return NextResponse.json({ error: 'application_ids required' }, { status: 400 })
  if (ids.length > 200) return NextResponse.json({ error: 'Too many ids' }, { status: 400 })

  try {
    const { data: apps } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, pipeline_stage')
      .in('id', ids)
    if (!apps || apps.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const oppIds = [...new Set(apps.map(a => a.opportunity_id))]
    const { data: owned } = await supabase
      .from('opportunities')
      .select('id')
      .in('id', oppIds)
      .eq('poster_user_id', user.id)
    const ownedSet = new Set((owned || []).map((o: any) => o.id))
    const authorized = apps.filter(a => ownedSet.has(a.opportunity_id))
    if (authorized.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // ─── set_stage: route each row through WorkflowService ───
    if (action === 'set_stage') {
      const stage = String(body.stage || '') as PipelineStage
      if (!VALID_STAGES.includes(stage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      }

      let updated = 0
      const errors: any[] = []

      for (const a of authorized) {
        try {
          await WorkflowService.transition({
            application_id: a.id,
            target_stage: stage,
            actor_id: user.id,
            source: 'bulk_action',
            reason: body.reason || null,
            options: {
              notify_candidate: body.notify_candidate !== false,
              notify_candidate_in_app: true,
              notify_owner_in_app: false,
            },
          })
          updated += 1
        } catch (e: any) {
          errors.push({ id: a.id, error: e?.message })
        }
      }

      return NextResponse.json({
        ok: true,
        updated,
        skipped: ids.length - authorized.length,
        errors,
      })
    }

    // ─── star / unstar ───
    if (action === 'star') {
      const flag = !!body.value
      const authorizedIds = authorized.map(a => a.id)
      const { data: rows, error } = await supabase
        .from('opportunity_applications')
        .update({ is_starred: flag, updated_at: new Date().toISOString() })
        .in('id', authorizedIds)
        .select('id, opportunity_id')
      if (error) throw error

      // Record events (no stage change)
      for (const r of rows || []) {
        await WorkflowService.recordEvent({
          application_id: r.id,
          opportunity_id: r.opportunity_id,
          event_type: flag ? 'starred' : 'unstarred',
          actor_id: user.id,
          source: 'bulk_action',
        })
      }
      return NextResponse.json({ ok: true, updated: rows?.length || 0 })
    }

    // ─── reviewer assign / unassign (kept from old impl) ───
    if (action === 'assign_reviewer') {
      const reviewerId: string = String(body.reviewer_id || '')
      if (!reviewerId) return NextResponse.json({ error: 'reviewer_id required' }, { status: 400 })
      const rowsToInsert = authorized.map(a => ({
        application_id: a.id,
        opportunity_id: a.opportunity_id,
        reviewer_id: reviewerId,
        assigned_by: user.id,
      }))
      const { error } = await supabase
        .from('opportunity_application_reviewers')
        .upsert(rowsToInsert, { onConflict: 'application_id,reviewer_id' })
      if (error) throw error

      for (const a of authorized) {
        await WorkflowService.recordEvent({
          application_id: a.id,
          opportunity_id: a.opportunity_id,
          event_type: 'reviewer_assigned',
          actor_id: user.id,
          source: 'bulk_action',
          metadata: { reviewer_id: reviewerId },
        })
      }
      return NextResponse.json({ ok: true, updated: rowsToInsert.length })
    }

    if (action === 'unassign_reviewer') {
      const reviewerId: string = String(body.reviewer_id || '')
      if (!reviewerId) return NextResponse.json({ error: 'reviewer_id required' }, { status: 400 })
      const authorizedIds = authorized.map(a => a.id)
      const { error } = await supabase
        .from('opportunity_application_reviewers')
        .delete()
        .in('application_id', authorizedIds)
        .eq('reviewer_id', reviewerId)
      if (error) throw error

      for (const a of authorized) {
        await WorkflowService.recordEvent({
          application_id: a.id,
          opportunity_id: a.opportunity_id,
          event_type: 'reviewer_unassigned',
          actor_id: user.id,
          source: 'bulk_action',
          metadata: { reviewer_id: reviewerId },
        })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('applications bulk error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}