// ============================================================
// lib/recruitment/service.decisions.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
} from '@/lib/kernel'

export async function recordDecision(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    application_id: string
    decision_type: 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN'
    message_to_applicant?: string
  },
  requestId?: string
) {
  const { data: app } = await supabase
    .from('looking_for_applications')
    .select('*, looking_for_listings(title, community_id)')
    .eq('id', input.application_id)
    .maybeSingle()

  if (!app) throw new NotFoundError('Application', input.application_id)

  const { data: decision, error } = await supabase
    .from('recruitment_decisions')
    .insert({
      application_id: input.application_id,
      decided_by: actorId,
      decision_type: input.decision_type,
      message_to_applicant: input.message_to_applicant || null,
    })
    .select('*')
    .single()

  if (error || !decision) throw new Error(`Decision insert failed: ${error?.message}`)

  // Update application stage
  const newStage = input.decision_type === 'HIRED' ? 'HIRED' : input.decision_type === 'REJECTED' ? 'REJECTED' : 'OFFER'
  await supabase
    .from('looking_for_applications')
    .update({ stage: newStage, status: input.decision_type })
    .eq('id', input.application_id)

  // Notify applicant
  const listingTitle = (app as any).looking_for_listings?.title || 'the position'
  await createNotification(supabase, {
    recipientId: app.applicant_id,
    type: `recruitment_decision_${input.decision_type.toLowerCase()}`,
    priority: 'HIGH',
    entityType: 'looking_for_application',
    entityId: app.id,
    title: input.decision_type === 'HIRED' ? `Offer & Hire: ${listingTitle}` : `Update on your application for ${listingTitle}`,
    body: input.message_to_applicant || `Your application status is now ${input.decision_type}.`,
    actionUrl: `/my-applications`,
    fromUserId: actorId,
    icon: input.decision_type === 'HIRED' ? 'check' : 'alert',
  })

  await writeAudit(supabase, {
    actorId,
    action: `recruitment.decision.${input.decision_type.toLowerCase()}`,
    entityType: 'recruitment_decision',
    entityId: decision.id,
    requestId,
  })

  const eventType = input.decision_type === 'HIRED'
    ? KERNEL_EVENT_TYPES.RECRUITMENT_DECISION_HIRED
    : KERNEL_EVENT_TYPES.RECRUITMENT_DECISION_REJECTED

  const event = createKernelEvent({
    eventType,
    aggregateType: 'recruitment_decision',
    aggregateId: decision.id,
    actorId,
    payload: { application_id: app.id, decision_type: input.decision_type },
  })
  const eventId = await writeOutbox(supabase, event)

  return { decision, event_id: eventId }
}