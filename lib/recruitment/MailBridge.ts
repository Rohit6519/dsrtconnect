import { createClient } from '@/lib/supabase/server'
import { TemplateEngine } from './TemplateEngine'
import { AuditService } from '@/lib/compliance/AuditService'
import type { RenderContext } from './types'

export interface MailBridgeInput {
  application_id: string
  opportunity_id: string
  template_key: string

  /** Override subject/body captured from the Command Center drawer */
  override_subject?: string
  override_body?: string
  next_step_label?: string

  actor_id?: string | null
  interview?: RenderContext['interview']
  offer?: RenderContext['offer']
}

export interface MailBridgeResult {
  inbox_message_id: string
  communication_id: string
  template_id: string | null
  scope_used: string
  used_override: boolean
  subject: string
}

/**
 * Owns ALL outbound candidate mail during a workflow.
 * Replaces the raw inserts in JobQueue.sendMailToCandidate.
 */
export class MailBridge {
  static async sendToCandidate(input: MailBridgeInput): Promise<MailBridgeResult> {
    const supabase = await createClient()

    // 1. Load application (for recipient & opportunity)
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id, pipeline_stage')
      .eq('id', input.application_id)
      .single()
    if (!app) throw new Error('application not found')

    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, title, slug, poster_user_id, project_id, venture_id')
      .eq('id', app.opportunity_id)
      .single()
    if (!opp) throw new Error('opportunity not found')

    // 2. Render template (or use inline override)
    const rendered = await TemplateEngine.render(input.template_key, {
      application_id: app.id,
      opportunity_id: opp.id,
      actor_id: input.actor_id,
      override_subject: input.override_subject,
      override_body: input.override_body,
      next_step_label: input.next_step_label,
      interview: input.interview,
      offer: input.offer,
    })

    const subject = rendered.subject
    const body = rendered.body_markdown

    // 3. Insert into DSRT Mail (existing inbox_messages)
    const { data: mail, error: mailErr } = await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: app.applicant_id,
        sender_id: opp.poster_user_id,
        message_type: 'application_update',
        status: 'unread',
        subject: subject.slice(0, 200),
        body: body.slice(0, 5000),
        reference_type: 'opportunity_application',
        reference_id: app.id,
        reference_name: opp.title,
        reference_slug: opp.slug,
        metadata: {
          opportunity_application_id: app.id,
          opportunity_id: opp.id,
          template_key: input.template_key,
          template_id: rendered.template_id,
          scope_used: rendered.scope_used,
          used_override: rendered.used_override,
          variables_missing: rendered.variables_missing,
        },
      })
      .select('id')
      .single()
    if (mailErr) throw mailErr

    // 4. Log to application_communications (Phase 1 table)
    const { data: comm, error: commErr } = await supabase
      .from('application_communications')
      .insert({
        application_id: app.id,
        opportunity_id: opp.id,
        template_key: input.template_key,
        subject,
        body_markdown: body,
        direction: 'outbound',
        channel: 'dsrt_mail',
        status: 'sent',
        recipient_id: app.applicant_id,
        sender_id: opp.poster_user_id,
        inbox_message_id: mail.id,
        sent_at: new Date().toISOString(),
        metadata: {
          template_id: rendered.template_id,
          scope_used: rendered.scope_used,
          used_override: rendered.used_override,
          variables_missing: rendered.variables_missing,
          next_step_label: input.next_step_label,
        },
      })
      .select('id')
      .single()
    if (commErr) throw commErr

    // 5. Record workflow event
    await supabase.from('application_workflow_events').insert({
      application_id: app.id,
      opportunity_id: opp.id,
      event_type: 'communication_sent',
      actor_id: input.actor_id || opp.poster_user_id,
      actor_role: 'system',
      source: 'automation',
      metadata: {
        channel: 'dsrt_mail',
        inbox_message_id: mail.id,
        communication_id: comm.id,
        template_key: input.template_key,
        template_id: rendered.template_id,
        scope_used: rendered.scope_used,
        used_override: rendered.used_override,
      },
    })

    // 6. Record audit log
    AuditService.record({
      action: 'mail.sent_to_candidate',
      category: 'mail',
      entity_type: 'inbox_message',
      entity_id: mail.id,
      opportunity_id: opp.id,
      application_id: app.id,
      actor_id: input.actor_id || opp.poster_user_id,
      actor_role: 'system',
      source: 'automation',
      after_state: { subject, template_key: input.template_key, scope_used: rendered.scope_used },
      metadata: {
        template_id: rendered.template_id,
        used_override: rendered.used_override,
        variables_missing: rendered.variables_missing,
      },
    }).catch(() => {})

    return {
      inbox_message_id: mail.id,
      communication_id: comm.id,
      template_id: rendered.template_id,
      scope_used: rendered.scope_used,
      used_override: rendered.used_override,
      subject,
    }
  }

  /**
   * Owner-facing notifications (e.g. new application received)
   * Uses a template but does NOT log to application_communications
   * (that log is candidate-facing only).
   */
  static async sendToOwner(params: {
    application_id: string
    opportunity_id: string
    template_key: string
    fallback_subject?: string
    fallback_body?: string
  }) {
    const supabase = await createClient()

    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id, cover_message, cover_letter')
      .eq('id', params.application_id)
      .single()
    if (!app) throw new Error('application not found')

    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, title, slug, poster_user_id')
      .eq('id', app.opportunity_id)
      .single()
    if (!opp) throw new Error('opportunity not found')

    let subject = params.fallback_subject || `Update on ${opp.title}`
    let body = params.fallback_body || ''

    try {
      const rendered = await TemplateEngine.render(params.template_key, {
        application_id: app.id,
        opportunity_id: opp.id,
      })
      subject = rendered.subject
      body = rendered.body_markdown
    } catch {
      // fallback stays
    }

    const { data: mail } = await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: opp.poster_user_id,
        sender_id: app.applicant_id,
        message_type: 'role_application',
        status: 'unread',
        subject: subject.slice(0, 200),
        body: body.slice(0, 5000),
        reference_type: 'opportunity_application',
        reference_id: app.id,
        reference_name: opp.title,
        reference_slug: opp.slug,
        metadata: {
          opportunity_application_id: app.id,
          opportunity_id: opp.id,
          template_key: params.template_key,
        },
      })
      .select('id')
      .single()

    if (mail?.id) {
      AuditService.record({
        action: 'mail.sent_to_owner',
        category: 'mail',
        entity_type: 'inbox_message',
        entity_id: mail.id,
        opportunity_id: opp.id,
        application_id: app.id,
        actor_id: app.applicant_id,
        actor_role: 'system',
        source: 'automation',
        after_state: { subject, template_key: params.template_key },
        metadata: { template_key: params.template_key },
      }).catch(() => {})
    }

    return { inbox_message_id: mail?.id }
  }
}