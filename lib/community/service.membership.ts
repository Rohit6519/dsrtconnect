// ============================================================
// lib/community/service.membership.ts
// Membership lifecycle service.
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
import { assertMembershipTransition } from './state-machines'
import type { MembershipStatus, MembershipSource } from './types'
import { incrementMemberCount } from './service.community'

async function safeLegacyMemberUpsert(
  supabase: SupabaseClient,
  communityId: string,
  userId: string,
  role: string
) {
  const { error } = await supabase
    .from('community_members')
    .upsert({ community_id: communityId, user_id: userId, role }, { onConflict: 'community_id,user_id' })
  if (error) {
    console.warn('[membership:legacy_upsert_failed]', error.message)
  }
}

async function safeLegacyMemberDelete(
  supabase: SupabaseClient,
  communityId: string,
  userId: string
) {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)
  if (error) {
    console.warn('[membership:legacy_delete_failed]', error.message)
  }
}

export async function joinCommunity(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  requestId?: string
): Promise<{ membership_id: string; status: MembershipStatus; event_id: string }> {
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug, status, visibility, join_policy, owner_identity_id')
    .eq('id', communityId)
    .maybeSingle()

  if (!community) throw new NotFoundError('Community', communityId)
  if (community.status !== 'ACTIVE') {
    throw new StateConflictError(`Community is not active (status: ${community.status})`)
  }

  // Check ban
  const { data: ban } = await supabase
    .from('community_bans')
    .select('id, expires_at')
    .eq('community_id', communityId)
    .eq('identity_id', actorId)
    .maybeSingle()

  if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
    throw new ForbiddenError('You are banned from this community')
  }

  // Check existing membership
  const { data: existing } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('identity_id', actorId)
    .maybeSingle()

  if (existing && existing.status === 'ACTIVE') {
    return { membership_id: existing.id, status: 'ACTIVE', event_id: '' }
  }

  // Decide target status based on join policy
  let targetStatus: MembershipStatus = 'ACTIVE'
  let source: MembershipSource = 'DIRECT_JOIN'
  let requiresApproval = false

  if (community.join_policy === 'CLOSED') {
    throw new ForbiddenError('This community is closed to new members')
  }
  if (community.join_policy === 'INVITE_ONLY') {
    throw new ForbiddenError('This community is invite-only')
  }
  if (community.join_policy === 'APPROVAL_REQUIRED') {
    targetStatus = 'PENDING'
    source = 'APPLICATION'
    requiresApproval = true
  }

  let membershipId: string
  if (existing) {
    assertMembershipTransition(existing.status as MembershipStatus, targetStatus)
    const { data: updated } = await supabase
      .from('community_memberships')
      .update({
        status: targetStatus,
        source,
        joined_at: targetStatus === 'ACTIVE' ? new Date().toISOString() : null,
      })
      .eq('id', existing.id)
      .select('id')
      .single()
    membershipId = updated!.id
  } else {
    const { data: created, error } = await supabase
      .from('community_memberships')
      .insert({
        community_id: communityId,
        identity_id: actorId,
        status: targetStatus,
        source,
      })
      .select('id')
      .single()
    if (error) throw error
    membershipId = created.id
  }

  // If active, assign the MEMBER role + increment counter + legacy sync
  if (targetStatus === 'ACTIVE') {
    const { data: memberRole } = await supabase
      .from('community_roles')
      .select('id')
      .eq('community_id', communityId)
      .eq('role_key', 'MEMBER')
      .maybeSingle()

    if (memberRole) {
      const { error: roleErr } = await supabase
        .from('community_membership_roles')
        .upsert(
          { membership_id: membershipId, role_id: memberRole.id, assigned_by: actorId },
          { onConflict: 'membership_id,role_id', ignoreDuplicates: true }
        )
      if (roleErr) console.warn('[membership:role_assign_failed]', roleErr.message)
    }

    await safeLegacyMemberUpsert(supabase, communityId, actorId, 'member')

    // ATOMIC increment — no more read-then-write with undefined field
    await incrementMemberCount(supabase, communityId, 1)
  }

  // Membership event
  await supabase.from('community_membership_events').insert({
    membership_id: membershipId,
    community_id: communityId,
    identity_id: actorId,
    event_type: targetStatus === 'ACTIVE' ? 'MEMBER_JOINED' : 'MEMBER_APPLIED',
    actor_id: actorId,
  })

  await writeAudit(supabase, {
    actorId,
    action: targetStatus === 'ACTIVE' ? 'community.member.joined' : 'community.join.requested',
    entityType: 'community_membership',
    entityId: membershipId,
    scopeType: 'community',
    scopeId: communityId,
    requestId,
    after: { status: targetStatus, source },
  })

  const eventType =
    targetStatus === 'ACTIVE'
      ? KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_JOINED
      : KERNEL_EVENT_TYPES.COMMUNITY_JOIN_REQUESTED

  const event = createKernelEvent({
    eventType,
    aggregateType: 'community_membership',
    aggregateId: membershipId,
    actorId,
    payload: {
      community_id: communityId,
      community_slug: community.slug,
      community_name: community.name,
      identity_id: actorId,
      status: targetStatus,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  // Notify owner on join requests (fire-and-forget notification; outbox is the source of truth)
  if (requiresApproval && community.owner_identity_id) {
    await createNotification(supabase, {
      recipientId: community.owner_identity_id,
      type: 'community_join_request',
      priority: 'NORMAL',
      entityType: 'community_membership',
      entityId: membershipId,
      title: 'New join request',
      body: `Someone requested to join ${community.name}`,
      actionUrl: `/community/${community.slug}/studio/applications`,
      fromUserId: actorId,
      icon: 'user',
    })
  }

  return { membership_id: membershipId, status: targetStatus, event_id: eventId }
}

export async function leaveCommunity(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  requestId?: string
): Promise<{ event_id: string }> {
  const { data: community } = await supabase
    .from('communities')
    .select('id, slug, name, owner_identity_id')
    .eq('id', communityId)
    .maybeSingle()

  if (!community) throw new NotFoundError('Community', communityId)
  if (community.owner_identity_id === actorId) {
    throw new ForbiddenError('The owner cannot leave. Transfer ownership first.')
  }

  const { data: membership } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('identity_id', actorId)
    .maybeSingle()

  if (!membership) throw new NotFoundError('Membership')
  if (membership.status !== 'ACTIVE') {
    throw new StateConflictError('You are not an active member of this community')
  }

  assertMembershipTransition(membership.status as MembershipStatus, 'LEFT')

  await supabase
    .from('community_memberships')
    .update({ status: 'LEFT', left_at: new Date().toISOString() })
    .eq('id', membership.id)

  await supabase.from('community_membership_roles').delete().eq('membership_id', membership.id)
  await safeLegacyMemberDelete(supabase, communityId, actorId)

  // Atomic decrement
  await incrementMemberCount(supabase, communityId, -1)

  await supabase.from('community_membership_events').insert({
    membership_id: membership.id,
    community_id: communityId,
    identity_id: actorId,
    event_type: 'MEMBER_LEFT',
    actor_id: actorId,
  })

  await writeAudit(supabase, {
    actorId,
    action: 'community.member.left',
    entityType: 'community_membership',
    entityId: membership.id,
    scopeType: 'community',
    scopeId: communityId,
    requestId,
    before: { status: 'ACTIVE' },
    after: { status: 'LEFT' },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_LEFT,
    aggregateType: 'community_membership',
    aggregateId: membership.id,
    actorId,
    payload: {
      community_id: communityId,
      identity_id: actorId,
      community_slug: community.slug,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { event_id: eventId }
}