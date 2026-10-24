// ============================================================
// lib/community/service.applications.ts
// Community application submission + review.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  StateConflictError,
} from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from './permissions'
import { assertApplicationTransition } from './state-machines'
import { incrementMemberCount } from './service.community'

export interface SubmitApplicationInput {
  answers?: Array<{
    question_key: string
    question_label?: string
    answer_value?: string
    answer_json?: Record<string, unknown>
  }>
}

async function safeLegacyMemberUpsert(
  supabase: SupabaseClient,
  communityId: string,
  userId: string,
  role: string
) {
  const { error } = await supabase
    .from('community_members')
    .upsert({ community_id: communityId, user_id: userId, role }, { onConflict: 'community_id,user_id' })
  if (error) console.warn('[applications:legacy_upsert_failed]', error.message)
}

export async function submitApplication(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  input: SubmitApplicationInput,
  requestId?: string
): Promise<{ application_id: string; event_id: string }> {
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug, owner_identity_id, join_policy, status')
    .eq('id', communityId)
    .maybeSingle()

  if (!community) throw new NotFoundError('Community', communityId)
  if (community.status !== 'ACTIVE') throw new StateConflictError('Community is not accepting applications')

  const { data: existing } = await supabase
    .from('community_applications')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('identity_id', actorId)
    .maybeSingle()

  if (existing && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(existing.status)) {
    throw new StateConflictError(`You already have an ${existing.status.toLowerCase()} application`)
  }

  let applicationId: string
  if (existing) {
    await supabase
      .from('community_applications')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    applicationId = existing.id
  } else {
    const { data: created, error } = await supabase
      .from('community_applications')
      .insert({
        community_id: communityId,
        identity_id: actorId,
        status: 'SUBMITTED',
      })
      .select('id')
      .single()
    if (error) throw error
    applicationId = created.id
  }

  // Answers
  if (input.answers && input.answers.length > 0) {
    await supabase.from('community_application_answers').delete().eq('application_id', applicationId)
    await supabase.from('community_application_answers').insert(
      input.answers.map((a) => ({
        application_id: applicationId,
        question_key: a.question_key,
        question_label: a.question_label ?? null,
        answer_value: a.answer_value ?? null,
        answer_json: a.answer_json ?? null,
      }))
    )
  }

  await writeAudit(supabase, {
    actorId,
    action: 'community.application.submitted',
    entityType: 'community_application',
    entityId: applicationId,
    scopeType: 'community',
    scopeId: communityId,
    requestId,
    after: { status: 'SUBMITTED' },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.COMMUNITY_APPLICATION_SUBMITTED,
    aggregateType: 'community_application',
    aggregateId: applicationId,
    actorId,
    payload: {
      community_id: communityId,
      identity_id: actorId,
      application_id: applicationId,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  // Notify owner
  if (community.owner_identity_id) {
    await createNotification(supabase, {
      recipientId: community.owner_identity_id,
      type: 'community_application',
      priority: 'NORMAL',
      entityType: 'community_application',
      entityId: applicationId,
      title: 'New application received',
      body: `A new application to ${community.name} awaits your review`,
      actionUrl: `/community/${community.slug}/studio/applications`,
      fromUserId: actorId,
      icon: 'user',
    })
  }

  return { application_id: applicationId, event_id: eventId }
}

export async function decideApplication(
  supabase: SupabaseClient,
  actorId: string,
  applicationId: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string,
  requestId?: string
): Promise<{ event_id: string }> {
  const { data: application } = await supabase
    .from('community_applications')
    .select('*, communities(id, name, slug)')
    .eq('id', applicationId)
    .maybeSingle()

  if (!application) throw new NotFoundError('Application', applicationId)

  const allowed = await hasCommunityPermission(
    supabase,
    actorId,
    application.community_id,
    COMMUNITY_PERMISSIONS.APPLICATION_DECIDE
  )
  if (!allowed) throw new ForbiddenError('You do not have permission to review applications')

  assertApplicationTransition(application.status, decision)

  await supabase
    .from('community_applications')
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
      review_reason: reason ?? null,
    })
    .eq('id', applicationId)

  // If APPROVED, activate membership
  if (decision === 'APPROVED') {
    const { data: existing } = await supabase
      .from('community_memberships')
      .select('id, status')
      .eq('community_id', application.community_id)
      .eq('identity_id', application.identity_id)
      .maybeSingle()

    let membershipId: string
    let wasAlreadyActive = false
    if (existing) {
      wasAlreadyActive = existing.status === 'ACTIVE'
      await supabase
        .from('community_memberships')
        .update({
          status: 'ACTIVE',
          source: 'APPLICATION',
          joined_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      membershipId = existing.id
    } else {
      const { data: created } = await supabase
        .from('community_memberships')
        .insert({
          community_id: application.community_id,
          identity_id: application.identity_id,
          status: 'ACTIVE',
          source: 'APPLICATION',
        })
        .select('id')
        .single()
      membershipId = created!.id
    }

    // Assign MEMBER role
    const { data: memberRole } = await supabase
      .from('community_roles')
      .select('id')
      .eq('community_id', application.community_id)
      .eq('role_key', 'MEMBER')
      .maybeSingle()

    if (memberRole) {
      const { error: assignErr } = await supabase
        .from('community_membership_roles')
        .upsert(
          { membership_id: membershipId, role_id: memberRole.id, assigned_by: actorId },
          { onConflict: 'membership_id,role_id', ignoreDuplicates: true }
        )
      if (assignErr) console.warn('[applications:role_assign_failed]', assignErr.message)
    }

    await safeLegacyMemberUpsert(supabase, application.community_id, application.identity_id, 'member')

    // Atomic increment ONLY if not already active
    if (!wasAlreadyActive) {
      await incrementMemberCount(supabase, application.community_id, 1)
    }

    await supabase.from('community_membership_events').insert({
      membership_id: membershipId,
      community_id: application.community_id,
      identity_id: application.identity_id,
      event_type: 'MEMBER_JOINED',
      actor_id: actorId,
      metadata: { source: 'APPLICATION', application_id: applicationId },
    })
  }

  await writeAudit(supabase, {
    actorId,
    action: `community.application.${decision.toLowerCase()}`,
    entityType: 'community_application',
    entityId: applicationId,
    scopeType: 'community',
    scopeId: application.community_id,
    requestId,
    before: { status: application.status },
    after: { status: decision, reason },
  })

  const eventType =
    decision === 'APPROVED'
      ? KERNEL_EVENT_TYPES.COMMUNITY_APPLICATION_APPROVED
      : KERNEL_EVENT_TYPES.COMMUNITY_APPLICATION_REJECTED

  const event = createKernelEvent({
    eventType,
    aggregateType: 'community_application',
    aggregateId: applicationId,
    actorId,
    payload: {
      community_id: application.community_id,
      identity_id: application.identity_id,
      application_id: applicationId,
      decision,
      reason,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  // Notify applicant
  const community = (application as any).communities
  await createNotification(supabase, {
    recipientId: application.identity_id,
    type:
      decision === 'APPROVED'
        ? 'community_application_approved'
        : 'community_application_rejected',
    priority: 'HIGH',
    entityType: 'community_application',
    entityId: applicationId,
    title:
      decision === 'APPROVED'
        ? `Welcome to ${community?.name || 'the community'}`
        : `Your application to ${community?.name || 'the community'}`,
    body:
      decision === 'APPROVED'
        ? 'Your application was approved. Tap to explore.'
        : reason || 'Your application was reviewed.',
    actionUrl: community?.slug ? `/community/${community.slug}` : '/community',
    fromUserId: actorId,
    icon: decision === 'APPROVED' ? 'check' : 'alert',
  })

  return { event_id: eventId }
}