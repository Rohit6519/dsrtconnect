// ============================================================
// lib/community/types.ts
// Types for the Community domain.
// ============================================================

export type CommunityStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
export type CommunityVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED'
export type JoinPolicy = 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITE_ONLY' | 'CLOSED'

export type MembershipStatus =
  | 'APPLIED'
  | 'INVITED'
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'LEFT'
  | 'REMOVED'
  | 'REJECTED'

export type MembershipSource =
  | 'DIRECT_JOIN'
  | 'APPLICATION'
  | 'INVITATION'
  | 'ADMIN_ADDED'
  | 'MIGRATION'

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED'
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED'

export type SystemRoleKey = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'

export interface Community {
  id: string
  public_id: string
  slug: string
  name: string
  short_description: string | null
  description: string | null
  mission: string | null
  community_type: string | null
  visibility: CommunityVisibility
  join_policy: JoinPolicy
  status: CommunityStatus
  logo_file_id: string | null
  cover_file_id: string | null
  cover_url: string | null
  banner_url: string | null
  owner_identity_id: string | null
  created_by: string | null
  location_text: string | null
  website: string | null
  topics: string[]
  category: string | null
  founded_at: string | null
  is_verified: boolean
  member_count: number
  post_count: number
  view_count: number
  like_count: number
  chat_enabled: boolean
  chat_members_only: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  archived_at: string | null
  version: number
}

export interface CommunitySettings {
  community_id: string
  allow_member_posts: boolean
  allow_member_polls: boolean
  allow_member_resources: boolean
  allow_member_invites: boolean
  allow_external_links: boolean
  allow_media_uploads: boolean
  require_post_approval: boolean
  require_application: boolean
  show_member_directory: boolean
  show_member_count: boolean
  default_post_visibility: string
}

export interface CommunityMembership {
  id: string
  community_id: string
  identity_id: string
  status: MembershipStatus
  source: MembershipSource
  joined_at: string
  left_at: string | null
  suspended_at: string | null
  banned_at: string | null
}

export interface CommunityRole {
  id: string
  community_id: string
  role_key: string
  name: string
  description: string | null
  is_system: boolean
  position: number
}

export interface CommunityInvitation {
  id: string
  community_id: string
  invited_identity_id: string | null
  invited_email: string | null
  invited_by: string | null
  role_id: string | null
  token_preview: string | null
  message: string | null
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

export interface CommunityApplication {
  id: string
  community_id: string
  identity_id: string
  status: ApplicationStatus
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_reason: string | null
  reviewer_note: string | null
}

export interface CommunityCapabilities {
  can_view: boolean
  can_join: boolean
  can_post: boolean
  can_invite: boolean
  can_manage_members: boolean
  can_moderate: boolean
  can_manage_settings: boolean
  can_delete: boolean
  can_transfer: boolean
  is_owner: boolean
  is_admin: boolean
  is_moderator: boolean
  is_member: boolean
  membership_status: MembershipStatus | null
}