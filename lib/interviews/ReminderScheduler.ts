import { createClient } from '@/lib/supabase/server'

/**
 * Queues interview-related jobs into application_workflow_jobs.
 * The existing cron (process-workflow-jobs) picks them up.
 */
export class ReminderScheduler {
  static async queueInvitation(interview_id: string, application_id: string, opportunity_id: string, actor_id: string) {
    const supabase = await createClient()
    await supabase.from('application_workflow_jobs').insert({
      application_id, opportunity_id,
      job_type: 'send_interview_invite',
      payload: { interview_id, actor_id },
      status: 'queued',
      scheduled_for: new Date().toISOString(),
    })
  }

  static async queueReminders(interview_id: string, application_id: string, opportunity_id: string, scheduledAt: Date) {
    const supabase = await createClient()
    const now = Date.now()
    const ts = scheduledAt.getTime()
    const rows: any[] = []

    const t24 = ts - 24 * 60 * 60 * 1000
    if (t24 > now + 60_000) {
      rows.push({
        application_id, opportunity_id,
        job_type: 'interview_reminder_24h',
        payload: { interview_id },
        status: 'queued',
        scheduled_for: new Date(t24).toISOString(),
      })
    }

    const t1 = ts - 60 * 60 * 1000
    if (t1 > now + 60_000) {
      rows.push({
        application_id, opportunity_id,
        job_type: 'interview_reminder_1h',
        payload: { interview_id },
        status: 'queued',
        scheduled_for: new Date(t1).toISOString(),
      })
    }

    if (rows.length > 0) {
      await supabase.from('application_workflow_jobs').insert(rows)
    }
  }

  static async queueCancelledNotice(interview_id: string, application_id: string, opportunity_id: string, actor_id: string) {
    const supabase = await createClient()
    await supabase.from('application_workflow_jobs').insert({
      application_id, opportunity_id,
      job_type: 'interview_cancelled_notice',
      payload: { interview_id, actor_id },
      status: 'queued',
      scheduled_for: new Date().toISOString(),
    })
  }

  static async queueRescheduledNotice(interview_id: string, application_id: string, opportunity_id: string, actor_id: string) {
    const supabase = await createClient()
    await supabase.from('application_workflow_jobs').insert({
      application_id, opportunity_id,
      job_type: 'interview_rescheduled_notice',
      payload: { interview_id, actor_id },
      status: 'queued',
      scheduled_for: new Date().toISOString(),
    })
  }
}