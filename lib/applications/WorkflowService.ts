import { createClient } from '@/lib/supabase/server'
import { AutomationDispatcher } from '@/lib/automation/AutomationDispatcher'
import { AuditService } from '@/lib/compliance/AuditService'
import type {
  PipelineStage,
  ApplicationStatus,
  WorkflowEventType,
  TransitionInput,
  TransitionResult,
  WorkflowSource,
  JobType,
} from './types'

// Mapping pipeline_stage → application.status
const STAGE_TO_STATUS: Record<PipelineStage, ApplicationStatus> = {
  draft:        'draft',
  applied:      'pending',
  submitted:    'pending',
  pending:      'pending',
  reviewing:    'under_review',
  screening:    'under_review',
  interviewing: 'under_review',
  offered:      'under_review',
  hired:        'accepted',
  rejected:     'rejected',
  withdrawn:    'withdrawn',
}

// Which stages are allowed to move to which (validation guard)
const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  draft:        ['submitted', 'withdrawn'],
  applied:      ['submitted', 'reviewing', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'],
  submitted:    ['reviewing', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'],
  pending:      ['reviewing', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'],
  reviewing:    ['screening', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'],
  screening:    ['reviewing', 'interviewing', 'offered', 'hired', 'rejected', 'withdrawn'],
  interviewing: ['screening', 'offered', 'hired', 'rejected', 'withdrawn'],
  offered:      ['interviewing', 'hired', 'rejected', 'withdrawn'],
  hired:        ['rejected', 'withdrawn'],
  rejected:     ['reviewing', 'screening'],     // allow reopen
  withdrawn:    ['submitted', 'reviewing'],     // allow reopen after re-apply
}

// Map a target stage → the specific event_type we record
const STAGE_EVENT: Record<PipelineStage, WorkflowEventType> = {
  draft:        'application_created',
  applied:      'application_submitted',
  submitted:    'application_submitted',
  pending:      'application_submitted',
  reviewing:    'stage_reviewing',
  screening:    'stage_screening',
  interviewing: 'stage_interviewing',
  offered:      'stage_offered',
  hired:        'stage_hired',
  rejected:     'stage_rejected',
  withdrawn:    'application_withdrawn',
}

export class WorkflowService {
  /**
   * The ONE entry point for changing an application's stage.
   * Every caller (bulk bar, sidebar chip, kanban drag, applicant withdraw, automation)
   * MUST go through this method.
   */
  static async transition(input: TransitionInput): Promise<TransitionResult> {
    const supabase = await createClient()

    // 1. Load the current application
    const { data: app, error: loadErr } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id, pipeline_stage, status, applicant_snapshot')
      .eq('id', input.application_id)
      .single()

    if (loadErr || !app) {
      throw new Error(`Application not found: ${input.application_id}`)
    }

    const fromStage = app.pipeline_stage as PipelineStage
    const toStage = input.target_stage

    // 2. Validate transition
    if (fromStage === toStage) {
      // No-op transition still records an event for idempotent triggers,
      // but skip the DB update to avoid unnecessary trigger fires.
      return {
        ok: true,
        application_id: app.id,
        from_stage: fromStage,
        to_stage: toStage,
        event_id: '',
        jobs_queued: [],
        status: app.status as ApplicationStatus,
      }
    }

    const allowed = ALLOWED_TRANSITIONS[fromStage] || []
    if (!allowed.includes(toStage)) {
      throw new Error(
        `Illegal transition: ${fromStage} → ${toStage}. Allowed: ${allowed.join(', ') || 'none'}`
      )
    }

    // 3. Compute new status
    const newStatus = STAGE_TO_STATUS[toStage]
    const nowIso = new Date().toISOString()

    // 4. Persist stage change
    const { error: updErr } = await supabase
      .from('opportunity_applications')
      .update({
        pipeline_stage: toStage,
        status: newStatus,
        stage_updated_at: nowIso,
        updated_at: nowIso,
        reviewed_by: input.actor_id || undefined,
        reviewed_at: input.actor_id ? nowIso : undefined,
      })
      .eq('id', app.id)

    if (updErr) throw updErr

    // 5. Write immutable event
    const eventType = STAGE_EVENT[toStage] || 'stage_changed'
    const { data: evt, error: evtErr } = await supabase
      .from('application_workflow_events')
      .insert({
        application_id: app.id,
        opportunity_id: app.opportunity_id,
        event_type: eventType,
        actor_id: input.actor_id,
        actor_role: input.actor_id === app.applicant_id ? 'applicant' : 'owner',
        from_stage: fromStage,
        to_stage: toStage,
        source: input.source,
        reason: input.reason || null,
        metadata: {
          ...(input.metadata || {}),
          applicant_id: app.applicant_id,
        },
      })
      .select('id')
      .single()

    if (evtErr) throw evtErr
    const eventId = evt.id

    // Record audit
    AuditService.record({
      action: `application.${eventType}`,
      category: 'application',
      entity_type: 'opportunity_application',
      entity_id: app.id,
      opportunity_id: app.opportunity_id,
      application_id: app.id,
      actor_id: input.actor_id,
      actor_role: input.actor_id === app.applicant_id ? 'applicant' : 'owner',
      reason: input.reason || null,
      source: (input.source || 'api') as any,
      before_state: { pipeline_stage: fromStage, status: app.status },
      after_state:  { pipeline_stage: toStage, status: newStatus },
      metadata: {
        triggering_event_id: eventId,
        ...(input.metadata || {}),
      },
    }).catch(() => {})

    // 6. Queue follow-up jobs (async — do not block the transition response)
    const jobIds: string[] = []
    const jobs = this.buildFollowUpJobs(app, fromStage, toStage, input, eventId)
    if (jobs.length > 0) {
      const { data: inserted } = await supabase
        .from('application_workflow_jobs')
        .insert(jobs)
        .select('id')
      if (inserted) jobIds.push(...inserted.map((j: any) => j.id))
    }

    // Fire automation rules (fire-and-forget — never blocks the response)
    AutomationDispatcher.dispatch({
      application_id: app.id,
      opportunity_id: app.opportunity_id,
      triggering_event_id: eventId,
      event: {
        id: eventId,
        event_type: eventType,
        from_stage: fromStage,
        to_stage: toStage,
        metadata: input.metadata || {},
      },
      metadata: input.metadata || {},
    }).catch(err => console.error('[automation.dispatch] transition failed:', err))

    return {
      ok: true,
      application_id: app.id,
      from_stage: fromStage,
      to_stage: toStage,
      event_id: eventId,
      jobs_queued: jobIds,
      status: newStatus,
    }
  }

  /**
   * Record a non-stage event (note added, star, reviewer assigned, etc)
   */
  static async recordEvent(params: {
    application_id: string
    opportunity_id: string
    event_type: WorkflowEventType
    actor_id: string | null
    source: WorkflowSource
    metadata?: Record<string, any>
    reason?: string
  }) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('application_workflow_events')
      .insert({
        application_id: params.application_id,
        opportunity_id: params.opportunity_id,
        event_type: params.event_type,
        actor_id: params.actor_id,
        actor_role: params.actor_id ? 'owner' : 'system',
        source: params.source,
        reason: params.reason || null,
        metadata: params.metadata || {},
      })
      .select('id')
      .single()

    if (data?.id) {
      AuditService.record({
        action: `application.${params.event_type}`,
        category: 'application',
        entity_type: 'opportunity_application',
        entity_id: params.application_id,
        opportunity_id: params.opportunity_id,
        application_id: params.application_id,
        actor_id: params.actor_id,
        actor_role: params.actor_id ? 'owner' : 'system',
        reason: params.reason || null,
        source: (params.source || 'api') as any,
        metadata: params.metadata || {},
      }).catch(() => {})

      AutomationDispatcher.dispatch({
        application_id: params.application_id,
        opportunity_id: params.opportunity_id,
        triggering_event_id: data.id,
        event: {
          id: data.id,
          event_type: params.event_type,
          metadata: params.metadata || {},
        },
        metadata: params.metadata || {},
      }).catch(err => console.error('[automation.dispatch] recordEvent failed:', err))
    }

    return data?.id || null
  }

  /**
   * Build follow-up jobs based on the target stage + caller options
   */
  private static buildFollowUpJobs(
    app: any,
    fromStage: PipelineStage,
    toStage: PipelineStage,
    input: TransitionInput,
    eventId: string,
  ) {
    const opts = input.options || {}
    const jobs: any[] = []
    const scheduleNow = new Date().toISOString()

    const push = (job_type: JobType, payload: any) => {
      jobs.push({
        application_id: app.id,
        opportunity_id: app.opportunity_id,
        job_type,
        payload,
        status: 'queued',
        scheduled_for: scheduleNow,
        triggered_by_event_id: eventId,
      })
    }

    // Owner in-app notification for candidate-initiated changes
    if (input.source === 'apply_endpoint' || input.source === 'submit_endpoint' || input.source === 'withdraw_endpoint') {
      push('notify_owner_in_app', { reason: toStage })
    }

    // Candidate in-app notification for owner-driven progression
    if (input.actor_id && input.actor_id !== app.applicant_id) {
      const candidateFacing: PipelineStage[] = [
        'reviewing', 'screening', 'interviewing', 'offered', 'hired', 'rejected',
      ]
      if (candidateFacing.includes(toStage) && opts.notify_candidate_in_app !== false) {
        push('notify_candidate_in_app', { to_stage: toStage, from_stage: fromStage })
      }
    }

    // Candidate mail (real DSRT Mail). Default ON for meaningful transitions
    // but can be suppressed with opts.notify_candidate = false
    if (input.actor_id && input.actor_id !== app.applicant_id && opts.notify_candidate !== false) {
      const mailStages: PipelineStage[] = ['screening', 'interviewing', 'offered', 'hired', 'rejected']
      if (mailStages.includes(toStage)) {
        push('send_mail_to_candidate', {
            to_stage: toStage,
            from_stage: fromStage,
            template_key: `dsrt.stage.${toStage}`,
            edited_subject: (input.metadata as any)?.edited_subject,
            edited_body:    (input.metadata as any)?.edited_body,
            next_step:      (input.metadata as any)?.next_step,
        })
      }
    }

    // Owner mail on applicant submission / withdrawal
    if (input.source === 'submit_endpoint' && opts.notify_owner !== false) {
      push('send_mail_to_owner', { event: 'application_submitted' })
    }
    if (input.source === 'withdraw_endpoint' && opts.notify_owner !== false) {
      push('send_mail_to_owner', { event: 'application_withdrawn' })
    }

    // Refresh cached analytics (best effort — safe to fail)
    push('refresh_analytics', { opportunity_id: app.opportunity_id })

    return jobs
  }
}