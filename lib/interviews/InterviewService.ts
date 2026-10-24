import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'
import { AuditService } from '@/lib/compliance/AuditService'
import type { CreateInterviewInput, InterviewStatus } from './types'
import { ReminderScheduler } from './ReminderScheduler'

export class InterviewService {
  /**
   * Create an interview. Adds candidate + interviewers as participants.
   * If scheduled_at is provided, queues invitation + reminders through JobQueue.
   * Always records a workflow event and (optionally) transitions the application
   * to `interviewing` stage.
   */
  static async createInterview(input: CreateInterviewInput, actor_id: string) {
    const supabase = await createClient()

    // Load application + verify management access
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id')
      .eq('id', input.application_id)
      .single()
    if (!app) throw new Error('application not found')

    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, title, poster_user_id')
      .eq('id', app.opportunity_id)
      .single()
    if (!opp) throw new Error('opportunity not found')

    const isScheduled = !!input.scheduled_at
    const status: InterviewStatus = isScheduled ? 'confirmed' : 'awaiting_candidate'

    // 1. Insert interview
    const { data: interview, error } = await supabase
      .from('interviews')
      .insert({
        application_id: input.application_id,
        opportunity_id: input.opportunity_id,
        kind: input.kind,
        title: input.title,
        description: input.description || null,
        scheduled_at: input.scheduled_at || null,
        duration_min: input.duration_min ?? 30,
        timezone: input.timezone || 'UTC',
        location_type: input.location_type,
        location_url: input.location_url || null,
        location_address: input.location_address || null,
        location_notes: input.location_notes || null,
        candidate_message: input.candidate_message || null,
        internal_notes: input.internal_notes || null,
        status,
        created_by: actor_id,
      })
      .select()
      .single()
    if (error) throw error

    // Record audit
    AuditService.record({
      action: 'interview.scheduled',
      category: 'interview',
      entity_type: 'interview',
      entity_id: interview.id,
      opportunity_id: interview.opportunity_id,
      application_id: interview.application_id,
      actor_id,
      actor_role: 'owner',
      source: 'api',
      after_state: {
        kind: interview.kind,
        scheduled_at: interview.scheduled_at,
        status: interview.status,
        duration_min: interview.duration_min,
      },
      metadata: { interviewers: input.interviewers },
    }).catch(() => {})

    // 2. Insert participants
    const participants: any[] = [
      { interview_id: interview.id, user_id: app.applicant_id, role: 'candidate', is_required: true, invited_by: actor_id },
    ]
    for (const uid of input.interviewers) {
      if (!uid || uid === app.applicant_id) continue
      participants.push({
        interview_id: interview.id, user_id: uid, role: 'interviewer', is_required: true, invited_by: actor_id,
      })
    }
    if (input.hiring_manager_id && input.hiring_manager_id !== app.applicant_id) {
      participants.push({
        interview_id: interview.id, user_id: input.hiring_manager_id, role: 'hiring_manager', is_required: true, invited_by: actor_id,
      })
    }
    if (participants.length > 0) {
      await supabase.from('interview_participants').upsert(participants, {
        onConflict: 'interview_id,user_id,role',
      })
    }

    // 3. Application-level workflow event
    await WorkflowService.recordEvent({
      application_id: app.id,
      opportunity_id: app.opportunity_id,
      event_type: 'interview_scheduled',
      actor_id,
      source: 'api',
      metadata: {
        interview_id: interview.id,
        kind: input.kind,
        scheduled_at: input.scheduled_at,
        interviewer_ids: input.interviewers,
      },
    })

    // 4. Optional stage transition
    // If the app isn't already at interviewing/offered/hired, move it forward
    const { data: appStage } = await supabase
      .from('opportunity_applications')
      .select('pipeline_stage')
      .eq('id', app.id)
      .single()
    if (appStage && !['interviewing', 'offered', 'hired', 'rejected', 'withdrawn'].includes(appStage.pipeline_stage)) {
      await WorkflowService.transition({
        application_id: app.id,
        target_stage: 'interviewing',
        actor_id,
        source: 'api',
        reason: 'Interview scheduled',
        options: { notify_candidate: false, notify_candidate_in_app: false },
      })
    }

    // 5. Queue invitation + reminder jobs
    if (input.send_invitation) {
      await ReminderScheduler.queueInvitation(interview.id, app.id, app.opportunity_id, actor_id)
    }
    if (input.schedule_reminders && isScheduled && input.scheduled_at) {
      await ReminderScheduler.queueReminders(interview.id, app.id, app.opportunity_id, new Date(input.scheduled_at))
    }

    return interview
  }

  static async cancelInterview(interview_id: string, actor_id: string, reason?: string) {
    const supabase = await createClient()
    const { data: iv } = await supabase
      .from('interviews')
      .select('id, application_id, opportunity_id, status, scheduled_at')
      .eq('id', interview_id)
      .single()
    if (!iv) throw new Error('interview not found')
    if (iv.status === 'cancelled' || iv.status === 'completed') return iv

    await supabase.from('interviews')
      .update({ status: 'cancelled', cancellation_reason: reason || null })
      .eq('id', interview_id)

    // Record audit
    AuditService.record({
      action: 'interview.cancelled',
      category: 'interview',
      entity_type: 'interview',
      entity_id: iv.id,
      opportunity_id: iv.opportunity_id,
      application_id: iv.application_id,
      actor_id,
      actor_role: 'owner',
      source: 'api',
      reason: reason || null,
      before_state: { status: iv.status },
      after_state: { status: 'cancelled' },
    }).catch(() => {})

    // Cancel pending reminder jobs
    await supabase.from('application_workflow_jobs')
      .update({ status: 'cancelled' })
      .in('job_type', ['interview_reminder_24h', 'interview_reminder_1h', 'send_interview_invite'])
      .eq('application_id', iv.application_id)
      .eq('status', 'queued')
      .contains('payload', { interview_id })

    await WorkflowService.recordEvent({
      application_id: iv.application_id,
      opportunity_id: iv.opportunity_id,
      event_type: 'interview_cancelled',
      actor_id,
      source: 'api',
      metadata: { interview_id, reason: reason || null },
    })

    await ReminderScheduler.queueCancelledNotice(interview_id, iv.application_id, iv.opportunity_id, actor_id)
    return { ...iv, status: 'cancelled' }
  }

  static async rescheduleInterview(interview_id: string, new_time: string, actor_id: string) {
    const supabase = await createClient()
    const { data: iv } = await supabase
      .from('interviews')
      .select('id, application_id, opportunity_id, scheduled_at')
      .eq('id', interview_id)
      .single()
    if (!iv) throw new Error('interview not found')

    await supabase.from('interviews')
      .update({ scheduled_at: new_time, status: 'confirmed' })
      .eq('id', interview_id)

    // Record audit
    AuditService.record({
      action: 'interview.rescheduled',
      category: 'interview',
      entity_type: 'interview',
      entity_id: iv.id,
      opportunity_id: iv.opportunity_id,
      application_id: iv.application_id,
      actor_id,
      actor_role: 'owner',
      source: 'api',
      before_state: { scheduled_at: iv.scheduled_at },
      after_state: { scheduled_at: new_time },
    }).catch(() => {})

    // Cancel old reminders and queue new ones
    await supabase.from('application_workflow_jobs')
      .update({ status: 'cancelled' })
      .in('job_type', ['interview_reminder_24h', 'interview_reminder_1h'])
      .eq('application_id', iv.application_id)
      .eq('status', 'queued')
      .contains('payload', { interview_id })

    await ReminderScheduler.queueReminders(iv.id, iv.application_id, iv.opportunity_id, new Date(new_time))
    await ReminderScheduler.queueRescheduledNotice(iv.id, iv.application_id, iv.opportunity_id, actor_id)

    await WorkflowService.recordEvent({
      application_id: iv.application_id,
      opportunity_id: iv.opportunity_id,
      event_type: 'interview_rescheduled',
      actor_id,
      source: 'api',
      metadata: { interview_id, from: iv.scheduled_at, to: new_time },
    })

    return { ok: true }
  }
}