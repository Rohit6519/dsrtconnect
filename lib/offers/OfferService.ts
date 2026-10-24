import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/applications/WorkflowService'
import { MailBridge } from '@/lib/recruitment/MailBridge'
import { AuditService } from '@/lib/compliance/AuditService'
import type { CreateOfferInput, Offer } from './types'

export class OfferService {
  /** Create or update a draft offer */
  static async prepareOffer(input: CreateOfferInput, actor_id: string): Promise<Offer> {
    const supabase = await createClient()

    const { data: app } = await supabase.from('opportunity_applications')
      .select('id, opportunity_id, applicant_id').eq('id', input.application_id).single()
    if (!app) throw new Error('Application not found')

    const payload = {
      application_id: input.application_id,
      opportunity_id: input.opportunity_id,
      candidate_id: app.applicant_id,
      issued_by: actor_id,
      status: 'draft',
      title: input.title,
      role_title: input.role_title,
      employment_type: input.employment_type,
      compensation_amount: input.compensation_amount,
      compensation_currency: input.compensation_currency,
      compensation_period: input.compensation_period,
      equity_percentage: input.equity_percentage || null,
      equity_vesting_terms: input.equity_vesting_terms || null,
      start_date: input.start_date,
      expiration_date: input.expiration_date || null,
      terms_markdown: input.terms_markdown,
      special_conditions: input.special_conditions || null,
    }

    const { data: offer, error } = await supabase.from('offers')
      .insert(payload).select().single()
    if (error) throw error

    await AuditService.record({
      action: 'offer.prepared',
      category: 'offer',
      entity_type: 'offer',
      entity_id: offer.id,
      opportunity_id: input.opportunity_id,
      application_id: input.application_id,
      actor_id,
      actor_role: 'owner',
      source: 'command_center',
      metadata: { role_title: input.role_title, comp: `${input.compensation_currency} ${input.compensation_amount}` },
    })

    return offer as Offer
  }

  /** Issue and send offer to candidate via MailBridge + transition stage to 'offered' */
  static async sendOffer(offer_id: string, actor_id: string, customMessage?: string): Promise<Offer> {
    const supabase = await createClient()

    const { data: offer } = await supabase.from('offers').select('*').eq('id', offer_id).single()
    if (!offer) throw new Error('Offer not found')

    const nowIso = new Date().toISOString()
    const { data: updated, error } = await supabase.from('offers')
      .update({ status: 'sent', sent_at: nowIso, updated_at: nowIso })
      .eq('id', offer_id).select().single()
    if (error) throw error

    // 1. Transition application stage to 'offered'
    await WorkflowService.transition({
      application_id: offer.application_id,
      target_stage: 'offered',
      actor_id,
      source: 'api',
      reason: 'Offer issued',
      options: { notify_candidate: false, notify_candidate_in_app: true },
    })

    // 2. Send candidate email via MailBridge using 'dsrt.stage.offered' template
    await MailBridge.sendToCandidate({
      application_id: offer.application_id,
      opportunity_id: offer.opportunity_id,
      template_key: 'dsrt.stage.offered',
      override_body: customMessage,
      actor_id,
      offer: {
        compensation: `${offer.compensation_currency} ${offer.compensation_amount.toLocaleString()} / ${offer.compensation_period}`,
        start_date: new Date(offer.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
    })

    await AuditService.record({
      action: 'offer.sent',
      category: 'offer',
      entity_type: 'offer',
      entity_id: offer_id,
      opportunity_id: offer.opportunity_id,
      application_id: offer.application_id,
      actor_id,
      actor_role: 'owner',
      source: 'api',
      after_state: { status: 'sent', sent_at: nowIso },
    })

    return updated as Offer
  }

  /** Candidate accepts offer with digital signature, IP, and User-Agent audit */
  static async acceptOffer(params: {
    offer_id: string
    candidate_id: string
    signature_name: string
    ip: string | null
    user_agent: string | null
  }): Promise<Offer> {
    const supabase = await createClient()

    const { data: offer } = await supabase.from('offers').select('*').eq('id', params.offer_id).single()
    if (!offer) throw new Error('Offer not found')
    if (offer.candidate_id !== params.candidate_id) throw new Error('Unauthorized')
    if (['accepted', 'declined', 'revoked', 'expired'].includes(offer.status)) {
      throw new Error(`Offer is already ${offer.status}`)
    }

    const nowIso = new Date().toISOString()
    const { data: updated, error } = await supabase.from('offers')
      .update({
        status: 'accepted',
        candidate_signature_name: params.signature_name,
        candidate_signed_at: nowIso,
        candidate_ip: params.ip,
        candidate_user_agent: params.user_agent,
        updated_at: nowIso,
      })
      .eq('id', params.offer_id).select().single()
    if (error) throw error

    // Transition application to 'hired'
    await WorkflowService.transition({
      application_id: offer.application_id,
      target_stage: 'hired',
      actor_id: params.candidate_id,
      source: 'api',
      reason: 'Offer digitally accepted by candidate',
      options: { notify_owner: true, notify_owner_in_app: true, notify_candidate: false },
    })

    await AuditService.record({
      action: 'offer.accepted',
      category: 'offer',
      entity_type: 'offer',
      entity_id: params.offer_id,
      opportunity_id: offer.opportunity_id,
      application_id: offer.application_id,
      actor_id: params.candidate_id,
      actor_role: 'applicant',
      actor_ip: params.ip,
      actor_user_agent: params.user_agent,
      source: 'api',
      metadata: { signature: params.signature_name, signed_at: nowIso },
    })

    return updated as Offer
  }

  /** Candidate declines offer */
  static async declineOffer(params: {
    offer_id: string
    candidate_id: string
    reason?: string
    note?: string
  }): Promise<Offer> {
    const supabase = await createClient()

    const { data: offer } = await supabase.from('offers').select('*').eq('id', params.offer_id).single()
    if (!offer) throw new Error('Offer not found')
    if (offer.candidate_id !== params.candidate_id) throw new Error('Unauthorized')

    const nowIso = new Date().toISOString()
    const { data: updated, error } = await supabase.from('offers')
      .update({
        status: 'declined',
        decline_reason: params.reason || 'candidate_declined',
        decline_note: params.note || null,
        declined_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', params.offer_id).select().single()
    if (error) throw error

    await AuditService.record({
      action: 'offer.declined',
      category: 'offer',
      entity_type: 'offer',
      entity_id: params.offer_id,
      opportunity_id: offer.opportunity_id,
      application_id: offer.application_id,
      actor_id: params.candidate_id,
      actor_role: 'applicant',
      source: 'api',
      reason: params.reason || null,
      metadata: { note: params.note },
    })

    return updated as Offer
  }
}