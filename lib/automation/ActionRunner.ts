import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'
import { MailBridge } from '@/lib/recruitment/MailBridge'
import { InterviewService } from '@/lib/interviews/InterviewService'
import { AuditService } from '@/lib/compliance/AuditService'
import type { AutomationContext } from './types'

export interface ActionOutcome {
  ok: boolean
  detail: Record<string, any>
  error?: string
}

export class ActionRunner {
  static async run(action_key: string, config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    try {
      switch (action_key) {
        case 'set_stage':                  return this.setStage(config, ctx)
        case 'send_candidate_mail':        return this.sendCandidateMail(config, ctx)
        case 'notify_owner_in_app':        return this.notifyOwnerInApp(config, ctx)
        case 'notify_candidate_in_app':    return this.notifyCandidateInApp(config, ctx)
        case 'add_internal_note':          return this.addInternalNote(config, ctx)
        case 'assign_reviewer':            return this.assignReviewer(config, ctx)
        case 'cancel_pending_interviews':  return this.cancelInterviews(config, ctx)
        default:
          return { ok: false, detail: {}, error: `Unknown action: ${action_key}` }
      }
    } catch (e: any) {
      return { ok: false, detail: {}, error: e?.message || String(e) }
    }
  }

  private static async setStage(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const result = await WorkflowService.transition({
      application_id: ctx.application_id,
      target_stage: config.stage,
      actor_id: null,
      source: 'automation',
      reason: 'automation_rule',
      options: {
        notify_candidate: config.notify_candidate !== false,
        notify_candidate_in_app: true,
      },
    })
    return { ok: true, detail: { event_id: result.event_id } }
  }

  private static async sendCandidateMail(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const r = await MailBridge.sendToCandidate({
      application_id: ctx.application_id,
      opportunity_id: ctx.opportunity_id,
      template_key: config.template_key,
      override_subject: config.override_subject,
      override_body: config.override_body,
    })
    return { ok: true, detail: { inbox_message_id: r.inbox_message_id, communication_id: r.communication_id } }
  }

  private static async notifyOwnerInApp(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const supabase = await createClient()
    await supabase.from('application_workflow_jobs').insert({
      application_id: ctx.application_id, opportunity_id: ctx.opportunity_id,
      job_type: 'notify_owner_in_app',
      payload: { reason: config.reason || 'automation' },
      status: 'queued', scheduled_for: new Date().toISOString(),
    })
    return { ok: true, detail: {} }
  }

  private static async notifyCandidateInApp(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const supabase = await createClient()
    await supabase.from('application_workflow_jobs').insert({
      application_id: ctx.application_id, opportunity_id: ctx.opportunity_id,
      job_type: 'notify_candidate_in_app',
      payload: { to_stage: ctx.event?.to_stage, reason: config.reason || 'automation' },
      status: 'queued', scheduled_for: new Date().toISOString(),
    })
    return { ok: true, detail: {} }
  }

  private static async addInternalNote(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const supabase = await createClient()
    const { data: opp } = await supabase.from('opportunities').select('poster_user_id').eq('id', ctx.opportunity_id).single()
    if (!opp) return { ok: false, detail: {}, error: 'opp missing' }

    const body = String(config.body || '').slice(0, 4000)
    const { data } = await supabase.from('application_internal_notes').insert({
      application_id: ctx.application_id,
      opportunity_id: ctx.opportunity_id,
      author_id: opp.poster_user_id,
      body,
      metadata: { source: 'automation' },
    }).select('id').single()

    // 🔑 AUDIT RECORD CALL
    if (data?.id) {
      AuditService.record({
        action: 'note.added',
        category: 'note',
        entity_type: 'application_internal_note',
        entity_id: data.id,
        opportunity_id: ctx.opportunity_id,
        application_id: ctx.application_id,
        actor_id: opp.poster_user_id,
        actor_role: 'system',
        source: 'automation',
        metadata: { chars: body.length },
      }).catch(() => {})

      await WorkflowService.recordEvent({
        application_id: ctx.application_id,
        opportunity_id: ctx.opportunity_id,
        event_type: 'note_added',
        actor_id: opp.poster_user_id,
        source: 'automation',
        metadata: { note_id: data.id, automated: true },
      })
    }

    return { ok: true, detail: { note_id: data?.id } }
  }

  private static async assignReviewer(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const supabase = await createClient()
    const reviewer_id = String(config.reviewer_id || '')
    if (!reviewer_id) return { ok: false, detail: {}, error: 'reviewer_id required' }
    await supabase.from('opportunity_application_reviewers').upsert({
      application_id: ctx.application_id, opportunity_id: ctx.opportunity_id,
      reviewer_id, assigned_by: null,
    }, { onConflict: 'application_id,reviewer_id' })
    await WorkflowService.recordEvent({
      application_id: ctx.application_id, opportunity_id: ctx.opportunity_id,
      event_type: 'reviewer_assigned', actor_id: null, source: 'automation',
      metadata: { reviewer_id, automated: true },
    })
    return { ok: true, detail: { reviewer_id } }
  }

  private static async cancelInterviews(config: any, ctx: AutomationContext): Promise<ActionOutcome> {
    const supabase = await createClient()
    const { data: ivs } = await supabase.from('interviews')
      .select('id, status')
      .eq('application_id', ctx.application_id)
      .in('status', ['proposed', 'awaiting_candidate', 'confirmed'])
    let cancelled = 0
    for (const iv of ivs || []) {
      try {
        await InterviewService.cancelInterview(iv.id, null as any, config.reason || 'Application closed')
        cancelled += 1
      } catch {}
    }
    return { ok: true, detail: { cancelled } }
  }
}