import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'
import type { PipelineStage } from '@/lib/applications/types'

export const dynamic = 'force-dynamic'

const VALID_STAGES: PipelineStage[] = [
  'applied', 'submitted', 'pending', 'reviewing', 'screening',
  'interviewing', 'offered', 'hired', 'rejected', 'withdrawn',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  const { id, appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('poster_user_id')
      .eq('id', id)
      .single()
    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    if (opp.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      pipeline_stage,
      status,
      internal_notes,
      internal_rating,
      is_starred,
      reason,
    } = body

    const { data: currentApp } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('id', appId)
      .eq('opportunity_id', id)
      .single()
    if (!currentApp) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    // 1. Stage transition → WorkflowService (single source of truth)
    if (pipeline_stage !== undefined && pipeline_stage !== currentApp.pipeline_stage) {
      if (!VALID_STAGES.includes(pipeline_stage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      }
      await WorkflowService.transition({
        application_id: appId,
        target_stage: pipeline_stage,
        actor_id: user.id,
        source: 'sidebar_chip',
        reason: reason || null,
        options: {
          notify_candidate: body.notify_candidate !== false,
          notify_candidate_in_app: true,
        },
      })
    }

    // 2. Other lightweight patches (notes, rating, star, first_viewed) — direct update
    const update: any = { updated_at: new Date().toISOString() }
    if (status !== undefined && pipeline_stage === undefined) update.status = status
    if (internal_notes !== undefined) update.internal_notes = internal_notes
    if (internal_rating !== undefined) update.internal_rating = internal_rating
    if (is_starred !== undefined) {
      update.is_starred = is_starred
    }
    if (!currentApp.first_viewed_at) {
      update.first_viewed_at = new Date().toISOString()
    }

    let updatedApp = currentApp
    if (Object.keys(update).length > 1) {
      const { data: u, error } = await supabase
        .from('opportunity_applications')
        .update(update)
        .eq('id', appId)
        .eq('opportunity_id', id)
        .select()
        .single()
      if (error) throw error
      updatedApp = u
    } else {
      // reload to return the fresh stage
      const { data: u } = await supabase
        .from('opportunity_applications')
        .select('*')
        .eq('id', appId)
        .single()
      if (u) updatedApp = u
    }

    // 3. Non-stage events
    if (is_starred !== undefined) {
      await WorkflowService.recordEvent({
        application_id: appId,
        opportunity_id: id,
        event_type: is_starred ? 'starred' : 'unstarred',
        actor_id: user.id,
        source: 'sidebar_chip',
      })
    }
    if (internal_notes !== undefined) {
      await WorkflowService.recordEvent({
        application_id: appId,
        opportunity_id: id,
        event_type: 'note_added',
        actor_id: user.id,
        source: 'sidebar_chip',
      })
    }

    return NextResponse.json({ application: updatedApp })
  } catch (e: any) {
    console.error('Update applicant error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}