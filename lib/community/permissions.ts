// ============================================================
// lib/community/permissions.ts
// Permission registry + capability resolver.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import type { CommunityCapabilities, MembershipStatus } from './types'

export const COMMUNITY_PERMISSIONS = {
  // Community
  COMMUNITY_VIEW: 'community.view',
  COMMUNITY_UPDATE: 'community.update',
  COMMUNITY_DELETE: 'community.delete',
  COMMUNITY_ARCHIVE: 'community.archive',
  COMMUNITY_TRANSFER: 'community.transfer',

  // Members
  MEMBERS_VIEW: 'members.view',
  MEMBERS_INVITE: 'members.invite',
  MEMBERS_APPROVE: 'members.approve',
  MEMBERS_REMOVE: 'members.remove',
  MEMBERS_SUSPEND: 'members.suspend',
  MEMBERS_BAN: 'members.ban',

  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_ASSIGN: 'roles.assign',
  ROLES_CREATE: 'roles.create',

  // Content
  POST_CREATE: 'post.create',
  POST_EDIT: 'post.edit',
  POST_DELETE: 'post.delete',
  POST_MODERATE: 'post.moderate',
  ANNOUNCEMENT_CREATE: 'announcement.create',
  ANNOUNCEMENT_PUBLISH: 'announcement.publish',
  ANNOUNCEMENT_PIN: 'announcement.pin',
  POLL_CREATE: 'poll.create',
  POLL_MANAGE: 'poll.manage',
  RESOURCE_CREATE: 'resource.create',

  // Invitations & Applications
  INVITATION_CREATE: 'invitation.create',
  INVITATION_REVOKE: 'invitation.revoke',
  APPLICATION_REVIEW: 'application.review',
  APPLICATION_DECIDE: 'application.decide',

  // Moderation
  MODERATION_REVIEW: 'moderation.review',
  MODERATION_WARN: 'moderation.warn',
  MODERATION_REMOVE: 'moderation.remove',
  MODERATION_BAN: 'moderation.ban',

  // Events (Phase 13)
  EVENT_VIEW: 'event.view',
  EVENT_CREATE: 'event.create',
  EVENT_MANAGE: 'event.manage',
  EVENT_PUBLISH: 'event.publish',
  EVENT_CANCEL: 'event.cancel',
  EVENT_CHECKIN_MANAGE: 'event.checkin.manage',
  EVENT_REGISTRATION_MANAGE: 'event.registration.manage',

  // Looking For (Phase 14)
  LOOKING_FOR_VIEW: 'looking_for.view',
  LOOKING_FOR_CREATE: 'looking_for.create',
  LOOKING_FOR_MANAGE: 'looking_for.manage',
  LOOKING_FOR_PUBLISH: 'looking_for.publish',

  // Recruitment (Phase 14)
  RECRUITMENT_CREATE: 'recruitment.create',
  RECRUITMENT_MANAGE: 'recruitment.manage',
  RECRUITMENT_REVIEW: 'recruitment.review',
  RECRUITMENT_DECIDE: 'recruitment.decide',
  RECRUITMENT_INTERVIEW_SCHEDULE: 'recruitment.interview.schedule',
  RECRUITMENT_INTERVIEW_FEEDBACK: 'recruitment.interview.feedback',
} as const

export type CommunityPermission = typeof COMMUNITY_PERMISSIONS[keyof typeof COMMUNITY_PERMISSIONS]

export async function resolveCommunityCapabilities(
  supabase: SupabaseClient,
  communityId: string,
  identityId: string | null
): Promise<CommunityCapabilities> {
  const defaults: CommunityCapabilities = {
    can_view: false,
    can_join: false,
    can_post: false,
    can_invite: false,
    can_manage_members: false,
    can_moderate: false,
    can_manage_settings: false,
    can_delete: false,
    can_transfer: false,
    is_owner: false,
    is_admin: false,
    is_moderator: false,
    is_member: false,
    membership_status: null,
  }

  const { data: community } = await supabase
    .from('communities')
    .select('id, visibility, owner_identity_id, status')
    .eq('id', communityId)
    .maybeSingle()

  if (!community) return defaults
  if (community.status === 'ARCHIVED') {
    return { ...defaults, can_view: community.visibility !== 'PRIVATE' }
  }

  const isPublic = community.visibility === 'PUBLIC'
  defaults.can_view = isPublic

  if (!identityId) {
    return {
      ...defaults,
      can_view: isPublic,
      can_join: isPublic,
    }
  }

  // Check membership
  const { data: membership } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('identity_id', identityId)
    .maybeSingle()

  // Read the raw status as a plain string first — no premature typing
  const rawStatus: string | null = membership?.status ?? null

  // Banned users get nothing beyond seeing the community exists
  if (rawStatus === 'BANNED') {
    return { ...defaults, membership_status: 'BANNED' }
  }

  // Now it's safe to narrow to MembershipStatus
  const membershipStatus = rawStatus as MembershipStatus | null
  const isMember = membershipStatus === 'ACTIVE'

  // Get user's role keys in this community
  const { data: roleAssignments } = membership
    ? await supabase
        .from('community_membership_roles')
        .select('community_roles(role_key)')
        .eq('membership_id', membership.id)
    : { data: [] as any[] }

  const roleKeys = new Set(
    (roleAssignments || [])
      .map((r: any) => r.community_roles?.role_key)
      .filter(Boolean)
  )

  const isOwner = community.owner_identity_id === identityId || roleKeys.has('OWNER')
  const isAdmin = isOwner || roleKeys.has('ADMIN')
  const isModerator = isAdmin || roleKeys.has('MODERATOR')

  return {
    can_view: isPublic || isMember || isAdmin,
    can_join:
      !isMember &&
      membershipStatus !== 'PENDING' &&
      membershipStatus !== 'APPLIED' &&
      membershipStatus !== 'INVITED',
    can_post: isMember || isAdmin,
    can_invite: isAdmin,
    can_manage_members: isAdmin,
    can_moderate: isModerator,
    can_manage_settings: isAdmin,
    can_delete: isOwner,
    can_transfer: isOwner,
    is_owner: isOwner,
    is_admin: isAdmin,
    is_moderator: isModerator,
    is_member: isMember,
    membership_status: membershipStatus,
  }
}

/**
 * Fine-grained permission check via role_permissions table.
 * Owners and platform admins always pass. System OWNER/ADMIN roles auto-pass every permission.
 */
export async function hasCommunityPermission(
  supabase: SupabaseClient,
  identityId: string,
  communityId: string,
  permission: CommunityPermission
): Promise<boolean> {
  if (!identityId) return false

  // Global admin override
  const { data: user } = await supabase
    .from('users')
    .select('is_admin, admin_role')
    .eq('id', identityId)
    .maybeSingle()

  if (
    user?.is_admin ||
    user?.admin_role === 'super_admin' ||
    user?.admin_role === 'admin'
  ) {
    return true
  }

  // Community owner always passes
  const { data: community } = await supabase
    .from('communities')
    .select('owner_identity_id')
    .eq('id', communityId)
    .maybeSingle()

  if (community?.owner_identity_id === identityId) return true

  // Load membership + roles (two clean queries — more reliable than 3-level nested select)
  const { data: membership } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', communityId)
    .eq('identity_id', identityId)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (!membership) return false

  const { data: roleRows } = await supabase
    .from('community_membership_roles')
    .select('role_id, community_roles!inner(id, role_key)')
    .eq('membership_id', membership.id)

  const roleIds = (roleRows || []).map((r: any) => r.role_id).filter(Boolean)
  if (roleIds.length === 0) return false

  // System OWNER/ADMIN roles get every permission by default
  const roleKeys = new Set(
    (roleRows || []).map((r: any) => r.community_roles?.role_key).filter(Boolean)
  )
  if (roleKeys.has('OWNER') || roleKeys.has('ADMIN')) return true

  // Otherwise check the permission table
  const { data: perms } = await supabase
    .from('community_role_permissions')
    .select('permission_key')
    .in('role_id', roleIds)
    .eq('permission_key', permission)
    .limit(1)

  return (perms || []).length > 0
}

/**
 * Convenience: same signature as hasCommunityPermission but returns quickly
 * for OWNER/ADMIN even if the specific permission hasn't been seeded yet.
 */
export async function hasCommunityPermissionOrAdmin(
  supabase: SupabaseClient,
  identityId: string,
  communityId: string,
  permission: CommunityPermission
): Promise<boolean> {
  return hasCommunityPermission(supabase, identityId, communityId, permission)
}