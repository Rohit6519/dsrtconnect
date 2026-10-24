import { createClient } from '@/lib/supabase/server'
import { notifyOwnerInApp, notifyCandidateInApp } from './notifications'
import { MailBridge } from '@/lib/recruitment/MailBridge'
import { AutomationDispatcher } from '@/lib/automation/AutomationDispatcher'
import { ExportService } from '@/lib/compliance/ExportService'

const MAX_JOBS_PER_RUN = 50

export class JobQueue {
  /** Called by cron: processes up to N queued jobs */
  static async processBatch(): Promise<{ processed: number; failed: number }> {
    const supabase = await createClient()

    // Claim a batch of jobs
    const nowIso = new Date().toISOString()
    const { data: jobs } = await supabase
      .from('application_workflow_jobs')
      .select('*')
      .in('status', ['queued', 'failed'])
      .lte('scheduled_for', nowIso)
      .lt('attempts', 5)
      .order('scheduled_for', { ascending: true })
      .limit(MAX_JOBS_PER_RUN)

    if (!jobs || jobs.length === 0) {
      return { processed: 0, failed: 0 }
    }

    let processed = 0
    let failed = 0

    for (const job of jobs) {
      // Mark running
      await supabase
        .from('application_workflow_jobs')
        .update({
          status: 'running',
          attempts: (job.attempts || 0) + 1,
          run_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      try {
        await this.runOne(job)
        await supabase
          .from('application_workflow_jobs')
          .update({
            status: 'done',
            finished_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
        processed += 1
      } catch (e: any) {
        const msg = e?.message || String(e)
        await supabase
          .from('application_workflow_jobs')
          .update({
            status: (job.attempts || 0) + 1 >= (job.max_attempts || 5) ? 'failed' : 'queued',
            last_error: msg.slice(0, 500),
            scheduled_for: new Date(Date.now() + 60_000).toISOString(), // retry in 1 min
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
        failed += 1
      }
    }

    return { processed, failed }
  }

  private static async runOne(job: any): Promise<void> {
    switch (job.job_type) {
      case 'notify_owner_in_app':
        await notifyOwnerInApp(job)
        return
      case 'notify_candidate_in_app':
        await notifyCandidateInApp(job)
        return
      case 'send_mail_to_candidate':
        await sendMailToCandidate(job)
        return
      case 'send_mail_to_owner':
        await sendMailToOwner(job)
        return
      case 'send_interview_invite':
        await sendInterviewInvite(job)
        return
      case 'interview_reminder_24h':
        await sendInterviewReminder(job, '24h')
        return
      case 'interview_reminder_1h':
        await sendInterviewReminder(job, '1h')
        return
      case 'interview_cancelled_notice':
        await sendInterviewCancelled(job)
        return
      case 'interview_rescheduled_notice':
        await sendInterviewRescheduled(job)
        return
      case 'run_automation_rule':
        await AutomationDispatcher.runRule(job.payload.run_id, job.payload.from_step || 0)
        return
      case 'run_export':
        await ExportService.runExport(job.payload.export_id)
        return
      case 'refresh_analytics':
        // Cached analytics are recomputed live in Phase 0 endpoints.
        // This job exists so we can attach cache invalidation later.
        return
      case 'webhook':
        // Placeholder for future user-configured webhooks (Phase 6)
        return
      default:
        throw new Error(`Unknown job_type: ${job.job_type}`)
    }
  }
}

// ─── Candidate mail via MailBridge (Phase 3) ───
async function sendMailToCandidate(job: any) {
  const stage = job.payload?.to_stage as string | undefined
  const templateKey =
    job.payload?.template_key || (stage ? `dsrt.stage.${stage}` : 'dsrt.stage.reviewing')

  await MailBridge.sendToCandidate({
    application_id: job.application_id,
    opportunity_id: job.opportunity_id,
    template_key: templateKey,
    override_subject: job.payload?.edited_subject,
    override_body: job.payload?.edited_body,
    next_step_label: job.payload?.next_step,
    actor_id: job.payload?.actor_id || null,
  })
}

// ─── Owner mail via MailBridge (Phase 3) ───
async function sendMailToOwner(job: any) {
  const event = job.payload?.event as string | undefined
  const templateKey =
    event === 'application_withdrawn'
      ? 'dsrt.owner.application_withdrawn'
      : 'dsrt.owner.application_submitted'

  await MailBridge.sendToOwner({
    application_id: job.application_id,
    opportunity_id: job.opportunity_id,
    template_key: templateKey,
  })
}

// ─── Interview lifecycle mail (Phase 4) ───
async function sendInterviewInvite(job: any) {
  const supabase = await createClient()
  const { data: iv } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', job.payload.interview_id)
    .single()
  if (!iv) throw new Error('interview not found')

  await MailBridge.sendToCandidate({
    application_id: iv.application_id,
    opportunity_id: iv.opportunity_id,
    template_key: 'dsrt.stage.interviewing',
    actor_id: job.payload.actor_id || null,
    interview: iv.scheduled_at
      ? {
          date: new Date(iv.scheduled_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          time: new Date(iv.scheduled_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          link: iv.location_url || undefined,
          duration_min: iv.duration_min,
        }
      : undefined,
  })
}

async function sendInterviewReminder(job: any, when: '24h' | '1h') {
  const supabase = await createClient()
  const { data: iv } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', job.payload.interview_id)
    .single()
  if (!iv || iv.status === 'cancelled' || iv.status === 'completed') return

  await MailBridge.sendToCandidate({
    application_id: iv.application_id,
    opportunity_id: iv.opportunity_id,
    template_key: when === '24h' ? 'dsrt.interview.reminder_24h' : 'dsrt.interview.reminder_1h',
    interview: {
      date: iv.scheduled_at
        ? new Date(iv.scheduled_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : undefined,
      time: iv.scheduled_at
        ? new Date(iv.scheduled_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
      link: iv.location_url || undefined,
      duration_min: iv.duration_min,
    },
  })
}

async function sendInterviewCancelled(job: any) {
  // Minimum viable — Phase 4a: reuse rejected template variant. Custom template optional.
  const supabase = await createClient()
  const { data: iv } = await supabase
    .from('interviews')
    .select('application_id, opportunity_id')
    .eq('id', job.payload.interview_id)
    .single()
  if (!iv) return

  await MailBridge.sendToCandidate({
    application_id: iv.application_id,
    opportunity_id: iv.opportunity_id,
    template_key: 'dsrt.interview.reminder_24h', // fallback template — override in Phase 4b
    override_subject: 'Your interview has been cancelled',
    override_body:
      "Hi {{candidate.first_name}},\n\nYour interview for \"{{opportunity.title}}\" has been cancelled. We'll reach out with next steps.\n\n— {{recruiter.name}}",
  })
}

async function sendInterviewRescheduled(job: any) {
  const supabase = await createClient()
  const { data: iv } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', job.payload.interview_id)
    .single()
  if (!iv) return

  await MailBridge.sendToCandidate({
    application_id: iv.application_id,
    opportunity_id: iv.opportunity_id,
    template_key: 'dsrt.interview.reminder_24h',
    override_subject: 'Your interview has been rescheduled',
    override_body:
      'Hi {{candidate.first_name}},\n\nYour interview for "{{opportunity.title}}" has been rescheduled to {{interview.date}} at {{interview.time}}.\n\nJoin here: {{interview.link}}\n\n— {{recruiter.name}}',
    interview: iv.scheduled_at
      ? {
          date: new Date(iv.scheduled_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          time: new Date(iv.scheduled_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          link: iv.location_url || undefined,
          duration_min: iv.duration_min,
        }
      : undefined,
  })
}