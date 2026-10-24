// ============================================================
// lib/community/service.studio.ts
// Studio operations: member management, role assignment,
// ownership transfer, archive, deletion request, audit read.
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
  ValidationError,
  StateConflictError,
} from '@/lib/kernel'
import {
  hasCommunityPermission,
  COMMUNITY_PERMISSIONS,
} from './permissions'
import {
  assertMembershipTransition,
  assertCommunityTransition,
} from './state-machines'
import type { MembershipStatus, CommunityStatus } from './types'
import { incrementMemberCount } from './service.community'

// -----------------------------------------------------------
// OVERVIEW
// -----------------------------------------------------------

export async function getStudioOverview(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string
) {
  const canView = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
  )
  if (!canView) throw new ForbiddenError('Studio access denied')

  const now = new Date()
  const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: pendingApplications },
    { count: pendingInvitations },
    { count: activeMembers },
    { count: newMembers7d },
    { data: recentActivity },
    { data: upcomingEvents },
    { data: pendingApplicationsList },
  ] = await Promise.all([
    supabase
      .from('community_applications')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW']),
    supabase
      .from('community_invitations_v2')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'PENDING'),
    supabase
      .from('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'ACTIVE'),
    supabase
      .from('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'ACTIVE')
      .gte('joined_at', past7),
    supabase
      .from('community_activity_projection')
      .select('id, verb, occurred_at, actor_id, metadata')
      .eq('community_id', communityId)
      .order('occurred_at', { ascending: false })
      .limit(10),
    supabase
      .from('community_events')
      .select('id, title, start_time, attendee_count')
      .eq('community_id', communityId)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(3),
    supabase
      .from('community_applications')
      .select('id, identity_id, submitted_at, status')
      .eq('community_id', communityId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
      .order('submitted_at', { ascending: false })
      .limit(5),
  ])

  const actorIds = Array.from(
    new Set([
      ...(recentActivity || []).map((a: any) => a.actor_id).filter(Boolean),
      ...(pendingApplicationsList || []).map((a: any) => a.identity_id).filter(Boolean),
    ])
  )
  const { data: actors } =
    actorIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .in('id', actorIds)
      : { data: [] as any[] }
  const actorMap = new Map((actors || []).map((u: any) => [u.id, u]))

  return {
    counts: {
      pending_applications: pendingApplications ?? 0,
      pending_invitations: pendingInvitations ?? 0,
      active_members: activeMembers ?? 0,
      new_members_7d: newMembers7d ?? 0,
    },
    recent_activity: (recentActivity || []).map((a: any) => ({
      ...a,
      actor: a.actor_id ? actorMap.get(a.actor_id) : null,
    })),
    upcoming_events: upcomingEvents || [],
    pending_applications_preview: (pendingApplicationsList || []).map((a: any) => ({
      ...a,
      applicant: actorMap.get(a.identity_id) ?? null,
    })),
  }
}

// -----------------------------------------------------------
// LIST MEMBERS — role filter pushed into SQL for correct pagination
// -----------------------------------------------------------

export async function listStudioMembers(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  opts: {
    role?: string | null
    status?: string | null
    q?: string
    cursor?: string | null
    limit: number
  }
) {
  const canView = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.MEMBERS_VIEW
  )
  if (!canView) throw new ForbiddenError('Not allowed')

  const statusFilter = opts.status ?? 'ACTIVE'

  // Step 1: If a role filter is provided, first look up membership IDs that
  // have that role. This pushes the role filter into the SQL layer so
  // cursor pagination is correct on the filtered set.
  let allowedMembershipIds: string[] | null = null
  if (opts.role) {
    const { data: roleRows } = await supabase
      .from('community_membership_roles')
      .select('membership_id, community_roles!inner(role_key, community_id)')
      .eq('community_roles.community_id', communityId)
      .eq('community_roles.role_key', opts.role)

    allowedMembershipIds = Array.from(
      new Set((roleRows || []).map((r: any) => r.membership_id).filter(Boolean))
    )

    if (allowedMembershipIds.length === 0) {
      return { items: [], next_cursor: null, has_more: false }
    }
  }

  // Step 2: Paginated fetch of the actual membership rows
  let query = supabase
    .from('community_memberships')
    .select('id, identity_id, joined_at, status, source, suspended_at, banned_at, left_at')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: false })
    .limit(opts.limit + 1)

  if (statusFilter !== 'ALL') query = query.eq('status', statusFilter)
  if (opts.cursor) query = query.lt('joined_at', opts.cursor)
  if (allowedMembershipIds) query = query.in('id', allowedMembershipIds)

  const { data: rows, error } = await query
  if (error) throw error
  const memRows = (rows || []) as any[]

  // Step 3: Enrich in one batch
  const membershipIds = memRows.map((m) => m.id)
  const identityIds = memRows.map((m) => m.identity_id)

  const [{ data: roleRows }, { data: users }, { data: restrictions }] = await Promise.all([
    membershipIds.length > 0
      ? supabase
          .from('community_membership_roles')
          .select('membership_id, community_roles!inner(role_key, name)')
          .in('membership_id', membershipIds)
      : Promise.resolve({ data: [] as any[] }),
    identityIds.length > 0
      ? supabase
          .from('users')
          .select('id, username, full_name, avatar_url, is_verified, tagline')
          .in('id', identityIds)
      : Promise.resolve({ data: [] as any[] }),
    membershipIds.length > 0
      ? supabase
          .from('community_member_restrictions')
          .select('membership_id, restriction_type, ends_at')
          .in('membership_id', membershipIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const roleMap = new Map<string, string[]>()
  for (const rr of (roleRows || []) as any[]) {
    const arr = roleMap.get(rr.membership_id) || []
    if (rr.community_roles?.role_key) arr.push(rr.community_roles.role_key)
    roleMap.set(rr.membership_id, arr)
  }
  const userMap = new Map((users || []).map((u: any) => [u.id, u]))
  const restrictionMap = new Map<string, any[]>()
  for (const r of (restrictions || []) as any[]) {
    const arr = restrictionMap.get(r.membership_id) || []
    if (!r.ends_at || new Date(r.ends_at) > new Date()) arr.push(r)
    restrictionMap.set(r.membership_id, arr)
  }

  let enriched = memRows.map((m) => {
    const roles = roleMap.get(m.id) || ['MEMBER']
    const topRole = roles.includes('OWNER')
      ? 'OWNER'
      : roles.includes('ADMIN')
      ? 'ADMIN'
      : roles.includes('MODERATOR')
      ? 'MODERATOR'
      : 'MEMBER'
    return {
      membership_id: m.id,
      identity_id: m.identity_id,
      joined_at: m.joined_at,
      status: m.status,
      source: m.source,
      suspended_at: m.suspended_at,
      banned_at: m.banned_at,
      left_at: m.left_at,
      role_keys: roles,
      top_role: topRole,
      restrictions: restrictionMap.get(m.id) || [],
      user: userMap.get(m.identity_id) ?? null,
    }
  })

  // Client-side search on already-fetched enriched set (small, safe)
  if (opts.q) {
    const q = opts.q.trim().toLowerCase()
    enriched = enriched.filter(
      (e) =>
        e.user &&
        ((e.user.full_name || '').toLowerCase().includes(q) ||
          (e.user.username || '').toLowerCase().includes(q))
    )
  }

  const hasMore = memRows.length > opts.limit
  const items = hasMore ? enriched.slice(0, opts.limit) : enriched
  const last = memRows[Math.min(opts.limit - 1, memRows.length - 1)]
  const nextCursor = hasMore && last ? last.joined_at : null

  return { items, next_cursor: nextCursor, has_more: hasMore }
}

// -----------------------------------------------------------
// MEMBER ACTIONS
// -----------------------------------------------------------

async function requireAdmin(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string
) {
  const ok = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.MEMBERS_REMOVE
  )
  if (!ok) throw new ForbiddenError('You do not have permission to manage members')
}

async function loadMembership(supabase: SupabaseClient, membershipId: string) {
  const { data } = await supabase
    .from('community_memberships')
    .select('id, community_id, identity_id, status')
    .eq('id', membershipId)
    .maybeSingle()
  if (!data) throw new NotFoundError('Membership', membershipId)
  return data
}

export async function memberAction(
  supabase: SupabaseClient,
  actorId: string,
  membershipId: string,
  action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'remove' | 'reinstate',
  reason?: string,
  requestId?: string
): Promise<{ event_id: string; new_status: MembershipStatus }> {
  const membership = await loadMembership(supabase, membershipId)
  await requireAdmin(supabase, actorId, membership.community_id)

  const { data: community } = await supabase
    .from('communities')
    .select('id, owner_identity_id, name, slug')
    .eq('id', membership.community_id)
    .maybeSingle()

  if (!community) throw new NotFoundError('Community', membership.community_id)
  if (community.owner_identity_id === membership.identity_id) {
    throw new ForbiddenError('Cannot moderate the owner. Transfer ownership first.')
  }

  const from = membership.status as MembershipStatus
  const targetMap: Record<string, MembershipStatus> = {
    suspend: 'SUSPENDED',
    unsuspend: 'ACTIVE',
    ban: 'BANNED',
    unban: 'ACTIVE',
    remove: 'REMOVED',
    reinstate: 'ACTIVE',
  }
  const to = targetMap[action]
  if (!to) throw new ValidationError([{ field: 'action', message: 'Invalid action' }])

  assertMembershipTransition(from, to)

  const patch: Record<string, any> = { status: to }
  if (action === 'suspend') patch.suspended_at = new Date().toISOString()
  if (action === 'ban') patch.banned_at = new Date().toISOString()
  if (action === 'unsuspend' || action === 'reinstate' || action === 'unban') {
    patch.suspended_at = null
    patch.banned_at = null
    patch.joined_at = new Date().toISOString()
  }
  if (action === 'remove') patch.left_at = new Date().toISOString()

  await supabase.from('community_memberships').update(patch).eq('id', membership.id)

  // Ban table
  if (action === 'ban') {
    await supabase.from('community_bans').upsert(
      {
        community_id: membership.community_id,
        identity_id: membership.identity_id,
        reason: reason ?? null,
        created_by: actorId,
      },
      { onConflict: 'community_id,identity_id' }
    )
  } else if (action === 'unban') {
    await supabase
      .from('community_bans')
      .delete()
      .eq('community_id', membership.community_id)
      .eq('identity_id', membership.identity_id)
  }

  // Legacy sync + counter
  if (to === 'REMOVED' || to === 'BANNED') {
    await supabase
      .from('community_members')
      .delete()
      .eq('community_id', membership.community_id)
      .eq('user_id', membership.identity_id)
    if (from === 'ACTIVE') {
      await incrementMemberCount(supabase, membership.community_id, -1)
    }
  } else if (to === 'ACTIVE' && from !== 'ACTIVE') {
    await supabase.from('community_members').upsert(
      {
        community_id: membership.community_id,
        user_id: membership.identity_id,
        role: 'member',
      },
      { onConflict: 'community_id,user_id' }
    )
    await incrementMemberCount(supabase, membership.community_id, 1)
  }

  const eventVerb = `MEMBER_${action.toUpperCase()}D`
  await supabase.from('community_membership_events').insert({
    membership_id: membership.id,
    community_id: membership.community_id,
    identity_id: membership.identity_id,
    event_type: eventVerb,
    actor_id: actorId,
    reason: reason ?? null,
  })

  await writeAudit(supabase, {
    actorId,
    action: `community.member.${action}`,
    entityType: 'community_membership',
    entityId: membership.id,
    scopeType: 'community',
    scopeId: membership.community_id,
    requestId,
    before: { status: from },
    after: { status: to },
    metadata: { reason },
  })

  const outboxEventType =
    action === 'suspend'
      ? KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_SUSPENDED
      : action === 'ban'
      ? KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_BANNED
      : action === 'remove'
      ? KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_LEFT
      : KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_JOINED

  const event = createKernelEvent({
    eventType: outboxEventType,
    aggregateType: 'community_membership',
    aggregateId: membership.id,
    actorId,
    payload: {
      community_id: membership.community_id,
      identity_id: membership.identity_id,
      action,
      previous_status: from,
      new_status: to,
      reason,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  // Notify affected member — but NOT on remove (they're gone, notification would be noise)
  if (action !== 'remove') {
    const notifTitle: Record<string, string> = {
      suspend: `You've been suspended from ${community.name}`,
      unsuspend: `You've been reinstated in ${community.name}`,
      ban: `You've been banned from ${community.name}`,
      unban: `Your ban has been lifted in ${community.name}`,
      reinstate: `Welcome back to ${community.name}`,
    }
    const title = notifTitle[action]
    if (title) {
      await createNotification(supabase, {
        recipientId: membership.identity_id,
        type: `community_member_${action}`,
        priority: action === 'ban' || action === 'suspend' ? 'HIGH' : 'NORMAL',
        entityType: 'community',
        entityId: membership.community_id,
        title,
        body: reason || undefined,
        actionUrl: `/community/${community.slug}`,
        fromUserId: actorId,
        icon: 'alert',
      })
    }
  }

  return { event_id: eventId, new_status: to }
}

// -----------------------------------------------------------
// ASSIGN ROLE
// -----------------------------------------------------------

export async function assignRole(
  supabase: SupabaseClient,
  actorId: string,
  membershipId: string,
  roleKey: string,
  requestId?: string
): Promise<{ event_id: string }> {
  const membership = await loadMembership(supabase, membershipId)
  const canManage = await hasCommunityPermission(
    supabase,
    actorId,
    membership.community_id,
    COMMUNITY_PERMISSIONS.ROLES_ASSIGN
  )
  if (!canManage) throw new ForbiddenError('Not allowed to assign roles')

  if (roleKey === 'OWNER') {
    throw new ValidationError([
      { field: 'role_key', message: 'Use ownership transfer for OWNER role' },
    ])
  }

  const { data: role } = await supabase
    .from('community_roles')
    .select('id, role_key, name')
    .eq('community_id', membership.community_id)
    .eq('role_key', roleKey)
    .maybeSingle()

  if (!role) throw new NotFoundError('Role', roleKey)

  const { data: memberRole } = await supabase
    .from('community_roles')
    .select('id')
    .eq('community_id', membership.community_id)
    .eq('role_key', 'MEMBER')
    .maybeSingle()

  // Insert new role assignments FIRST, then remove old ones. Avoids the
  // race window where the user has no roles at all.
  const targetRoleIds: string[] = [role.id]
  if (memberRole && role.role_key !== 'MEMBER') targetRoleIds.push(memberRole.id)

  for (const roleId of targetRoleIds) {
    await supabase.from('community_membership_roles').upsert(
      { membership_id: membership.id, role_id: roleId, assigned_by: actorId },
      { onConflict: 'membership_id,role_id', ignoreDuplicates: true }
    )
  }

  // Now remove any roles NOT in the target set
  await supabase
    .from('community_membership_roles')
    .delete()
    .eq('membership_id', membership.id)
    .not('role_id', 'in', `(${targetRoleIds.map((id) => `"${id}"`).join(',')})`)

  const legacyRole = role.role_key.toLowerCase()
  await supabase
    .from('community_members')
    .update({ role: legacyRole })
    .eq('community_id', membership.community_id)
    .eq('user_id', membership.identity_id)

  await writeAudit(supabase, {
    actorId,
    action: 'community.role.assigned',
    entityType: 'community_membership',
    entityId: membership.id,
    scopeType: 'community',
    scopeId: membership.community_id,
    requestId,
    after: { role_key: role.role_key },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.COMMUNITY_ROLE_ASSIGNED,
    aggregateType: 'community_membership',
    aggregateId: membership.id,
    actorId,
    payload: {
      community_id: membership.community_id,
      identity_id: membership.identity_id,
      role_key: role.role_key,
      role_id: role.id,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { event_id: eventId }
}

// -----------------------------------------------------------
// OWNERSHIP TRANSFER
// -----------------------------------------------------------

export async function transferOwnership(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  newOwnerIdentityId: string,
  requestId?: string
): Promise<{ event_id: string }> {
  const { data: community } = await supabase
    .from('communities')
    .select('id, owner_identity_id, name, slug')
    .eq('id', communityId)
    .maybeSingle()
  if (!community) throw new NotFoundError('Community', communityId)
  if (community.owner_identity_id !== actorId) {
    throw new ForbiddenError('Only the current owner can transfer ownership')
  }
  if (newOwnerIdentityId === actorId) {
    throw new ValidationError([{ field: 'new_owner', message: 'You are already the owner' }])
  }

  const { data: newOwnerMembership } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('identity_id', newOwnerIdentityId)
    .maybeSingle()

  if (!newOwnerMembership || newOwnerMembership.status !== 'ACTIVE') {
    throw new ValidationError([
      { field: 'new_owner', message: 'New owner must be an active member' },
    ])
  }

  const { data: currentOwnerMembership } = await supabase
    .from('community_memberships')
    .select('id')
    .eq('community_id', communityId)
    .eq('identity_id', actorId)
    .maybeSingle()

  const { data: ownerRole } = await supabase
    .from('community_roles')
    .select('id')
    .eq('community_id', communityId)
    .eq('role_key', 'OWNER')
    .maybeSingle()
  const { data: adminRole } = await supabase
    .from('community_roles')
    .select('id')
    .eq('community_id', communityId)
    .eq('role_key', 'ADMIN')
    .maybeSingle()

  if (!ownerRole) throw new Error('OWNER role missing for community')

  // Add new owner FIRST, then demote previous owner. Never leave community without an owner.
  await supabase.from('community_membership_roles').upsert(
    { membership_id: newOwnerMembership.id, role_id: ownerRole.id, assigned_by: actorId },
    { onConflict: 'membership_id,role_id' }
  )

  await supabase
    .from('communities')
    .update({ owner_identity_id: newOwnerIdentityId })
    .eq('id', communityId)

  if (currentOwnerMembership) {
    await supabase
      .from('community_membership_roles')
      .delete()
      .eq('membership_id', currentOwnerMembership.id)
      .eq('role_id', ownerRole.id)
    if (adminRole) {
      await supabase.from('community_membership_roles').upsert(
        { membership_id: currentOwnerMembership.id, role_id: adminRole.id, assigned_by: actorId },
        { onConflict: 'membership_id,role_id' }
      )
    }
  }

  await supabase
    .from('community_members')
    .update({ role: 'owner' })
    .eq('community_id', communityId)
    .eq('user_id', newOwnerIdentityId)
  await supabase
    .from('community_members')
    .update({ role: 'admin' })
    .eq('community_id', communityId)
    .eq('user_id', actorId)

  await writeAudit(supabase, {
    actorId,
    action: 'community.ownership.transferred',
    entityType: 'community',
    entityId: communityId,
    requestId,
    before: { owner_identity_id: actorId },
    after: { owner_identity_id: newOwnerIdentityId },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.COMMUNITY_OWNERSHIP_TRANSFERRED,
    aggregateType: 'community',
    aggregateId: communityId,
    actorId,
    payload: {
      community_id: communityId,
      previous_owner: actorId,
      new_owner: newOwnerIdentityId,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  await createNotification(supabase, {
    recipientId: newOwnerIdentityId,
    type: 'community_ownership_received',
    priority: 'HIGH',
    entityType: 'community',
    entityId: communityId,
    title: `You are now the owner of ${community.name}`,
    body: 'Full authority over this community has been transferred to you.',
    actionUrl: `/community/${community.slug}/studio`,
    fromUserId: actorId,
    icon: 'check',
  })

  return { event_id: eventId }
}

// -----------------------------------------------------------
// ARCHIVE
// -----------------------------------------------------------

export async function archiveCommunityStudio(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  requestId?: string
): Promise<{ event_id: string }> {
  const { data: existing } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .maybeSingle()
  if (!existing) throw new NotFoundError('Community', communityId)
  if (existing.owner_identity_id !== actorId) {
    throw new ForbiddenError('Only the owner can archive this community')
  }

  assertCommunityTransition(existing.status as CommunityStatus, 'ARCHIVED')

  await supabase
    .from('communities')
    .update({
      status: 'ARCHIVED',
      archived_at: new Date().toISOString(),
    })
    .eq('id', communityId)

  await writeAudit(supabase, {
    actorId,
    action: 'community.archived',
    entityType: 'community',
    entityId: communityId,
    requestId,
    before: { status: existing.status },
    after: { status: 'ARCHIVED' },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.COMMUNITY_ARCHIVED,
    aggregateType: 'community',
    aggregateId: communityId,
    actorId,
    payload: { community_id: communityId },
  })
  const eventId = await writeOutbox(supabase, event)

  return { event_id: eventId }
}

// -----------------------------------------------------------
// AUDIT VIEWER
// -----------------------------------------------------------

export async function listCommunityAudit(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  cursor: string | null,
  limit: number
) {
  const canView = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
  )
  if (!canView) throw new ForbiddenError('Not allowed')

  // Single query with .or() covering both scope and entity — more efficient
  // than two separate queries + client merge (fixes Phase 9 Issue #86)
  let query = supabase
    .from('kernel_audit_logs')
    .select('*')
    .or(
      `and(scope_type.eq.community,scope_id.eq.${communityId}),and(entity_type.eq.community,entity_id.eq.${communityId})`
    )
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query
  if (error) throw error

  const rows = (data || []) as any[]
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const last = items[items.length - 1]
  const nextCursor = hasMore && last ? last.created_at : null

  const actorIds = Array.from(new Set(items.map((r) => r.actor_id).filter(Boolean)))
  const { data: actors } =
    actorIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .in('id', actorIds)
      : { data: [] as any[] }
  const actorMap = new Map((actors || []).map((u: any) => [u.id, u]))

  return {
    items: items.map((r) => ({
      ...r,
      actor: r.actor_id ? actorMap.get(r.actor_id) : null,
    })),
    next_cursor: nextCursor,
    has_more: hasMore,
  }
}