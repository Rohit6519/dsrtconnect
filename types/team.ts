// ═══════════════════════════════════════════════════════════════════════════
// DSRT TEAM SYSTEM — SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Uuid = string
export type IsoString = string

// ─── STATE MACHINES ────────────────────────────────────────────────────────
export type MemberState =
  | 'invited' | 'viewed' | 'accepted' | 'onboarding'
  | 'active' | 'paused' | 'offboarding' | 'removed'
  | 'declined' | 'expired' | 'revoked'

export type InvitationState =
  | 'draft' | 'sent' | 'delivered' | 'viewed'
  | 'accepted' | 'declined' | 'expired' | 'revoked'
  | 'onboarding' | 'completed'

export type WorkPlanStatus =
  | 'draft' | 'proposed' | 'confirmed' | 'revised'
  | 'active' | 'completed' | 'cancelled'

export type ObjectiveStatus =
  | 'assigned' | 'in_progress' | 'blocked' | 'awaiting_review'
  | 'completed' | 'cancelled' | 'deferred'

export type ObjectivePriority = 'low' | 'normal' | 'high' | 'critical'
export type ResponsibilityPriority = 'low' | 'normal' | 'high' | 'critical'

export type WorkingModel = 'flexible' | 'part_time' | 'full_time' | 'project_based'

export type SeniorityLevel =
  | 'intern' | 'junior' | 'mid' | 'senior' | 'lead'
  | 'principal' | 'staff' | 'executive' | 'advisor'

export type RelationshipType =
  | 'reports_to' | 'manages' | 'collaborates_with'
  | 'advises' | 'co_owns' | 'contributes_to'

export type OnboardingStep =
  | 'identity' | 'profile' | 'skills' | 'preferences'
  | 'communication' | 'work_plan' | 'workspace' | 'complete'

// ─── PERMISSION MATRIX ─────────────────────────────────────────────────────
export interface AccessPermissions {
  project?: {
    view: boolean
    edit: boolean
    delete: boolean
  }
  team?: {
    view: boolean
    invite: boolean
    remove: boolean
    manage_permissions: boolean
  }
  projects?: {
    view: boolean
    create: boolean
    edit: boolean
    archive: boolean
  }
  financial?: {
    view: boolean
    manage: boolean
  }
  research?: {
    view: boolean
    create: boolean
    edit: boolean
  }
  mail?: {
    use: boolean
    team_comm: boolean
  }
  analytics?: {
    view: boolean
    export: boolean
  }
}

// ─── TABLES ────────────────────────────────────────────────────────────────

// 1. Role Definitions
export interface TeamRoleDefinition {
  id: Uuid
  project_id: Uuid | null
  key: string
  label: string
  description: string | null
  is_system: boolean
  is_leadership: boolean
  default_permissions: AccessPermissions
  created_by: Uuid | null
  created_at: IsoString
  updated_at: IsoString
}

// 2. Departments
export interface TeamDepartment {
  id: Uuid
  project_id: Uuid
  name: string
  color: string | null
  sort_order: number
  created_by: Uuid | null
  created_at: IsoString
}

// 3. Responsibilities
export interface TeamResponsibility {
  id: Uuid
  project_id: Uuid
  department_id: Uuid | null
  title: string
  description: string | null
  category: string | null
  priority: ResponsibilityPriority
  created_by: Uuid | null
  created_at: IsoString
  updated_at: IsoString
}

// 4. Member Responsibilities (Many-to-Many)
export interface TeamMemberResponsibility {
  id: Uuid
  project_id: Uuid
  member_id: Uuid
  responsibility_id: Uuid | null
  custom_title: string | null
  is_primary: boolean
  assigned_at: IsoString
  assigned_by: Uuid | null
  // Joins
  responsibility?: Pick<TeamResponsibility, 'title' | 'description'>
}

// 5. Members (Extended from project_members)
export interface TeamMember {
  id: Uuid
  project_id: Uuid
  user_id: Uuid
  role: string | null
  department: string | null
  seniority: SeniorityLevel | null
  reports_to: Uuid | null
  member_state: MemberState
  working_model: WorkingModel | null
  commitment_hours: number | null
  start_date: string | null // YYYY-MM-DD
  timezone: string | null
  is_lead: boolean
  invited_by: Uuid | null
  invited_at: IsoString | null
  accepted_at: IsoString | null
  joined_at: IsoString | null
  onboarding_complete: boolean
  last_reviewed_at: IsoString | null
  updated_at: IsoString
  // Joins (via RPC list_project_team_members)
  user?: {
    id: Uuid
    full_name: string | null
    username: string | null
    avatar_url: string | null
    is_verified: boolean
    email: string | null
    tagline: string | null
  }
  responsibilities?: Array<{
    id: Uuid
    title: string
    description: string | null
    is_primary: boolean
  }>
  active_objectives_count?: number
  blocked_objectives_count?: number
}

// 6. Invitations (Immutable Snapshot)
export interface InvitationSnapshot {
  role_id: Uuid
  role_label: string
  department_id: Uuid | null
  department_name: string | null
  seniority: SeniorityLevel | null
  reports_to_member_id: Uuid | null
  reports_to_name: string | null
  is_lead: boolean
  permissions: AccessPermissions
  responsibilities: Array<{
    id: Uuid | null
    title: string
    is_primary: boolean
  }>
  work_plan: {
    start_date: string | null
    commitment_hours: number | null
    working_model: WorkingModel | null
    timezone: string | null
    objectives: Array<{
      title: string
      priority: ObjectivePriority
      due_date: string | null
    }>
  }
}

export interface TeamInvitation {
  id: Uuid
  project_id: Uuid
  invited_user_id: Uuid | null
  invited_email: string | null
  invited_name: string | null
  inviter_id: Uuid
  personal_message: string | null
  snapshot: InvitationSnapshot
  snapshot_version: number
  token_prefix: string // Safe for UI rendering (e.g. tracking)
  state: InvitationState
  created_at: IsoString
  sent_at: IsoString | null
  first_viewed_at: IsoString | null
  last_viewed_at: IsoString | null
  view_count: number
  responded_at: IsoString | null
  expires_at: IsoString
  created_member_id: Uuid | null
  revoked_at: IsoString | null
  revoked_by: Uuid | null
  revoked_reason: string | null
  // Joins
  inviter?: {
    full_name: string | null
    avatar_url: string | null
  }
  project?: {
    name: string
    slug: string
    logo_url: string | null
  }
}

// 7. Work Plans
export interface TeamWorkPlan {
  id: Uuid
  project_id: Uuid
  member_id: Uuid
  status: WorkPlanStatus
  proposed_by: Uuid | null
  confirmed_at: IsoString | null
  confirmed_by: Uuid | null
  member_response: 'accepted' | 'suggested_changes' | 'declined' | null
  member_response_at: IsoString | null
  suggested_changes: Record<string, any> | null
  notes: string | null
  created_at: IsoString
  updated_at: IsoString
}

// 8. Objectives
export interface TeamObjective {
  id: Uuid
  project_id: Uuid
  work_plan_id: Uuid | null
  title: string
  description: string | null
  success_criteria: Array<{
    id: string
    text: string
    is_complete: boolean
  }>
  dependencies: Array<{
    id: string
    type: 'objective' | 'milestone' | 'external'
    target_id: string
    description: string
  }>
  owner_member_id: Uuid | null
  priority: ObjectivePriority
  status: ObjectiveStatus
  start_date: string | null
  due_date: string | null
  completed_at: IsoString | null
  blocked_reason: string | null
  sort_order: number
  created_by: Uuid | null
  created_at: IsoString
  updated_at: IsoString
}

// 9. Onboarding
export interface ProfessionalData {
  title?: string
  primary_discipline?: string
  experience_level?: string
  portfolio_url?: string
  github_url?: string
  linkedin_url?: string
  website_url?: string
  timezone?: string
  location?: string
}

export interface PreferencesData {
  communication_style?: 'async-first' | 'balanced' | 'meeting-heavy'
  preferred_channels?: string[]
  response_expectation?: 'same day' | '24 hours' | '48 hours'
  deep_work_hours?: string
}

export interface SkillsData {
  skills: string[]
}

export interface TeamOnboarding {
  id: Uuid
  project_id: Uuid
  member_id: Uuid
  invitation_id: Uuid | null
  current_step: OnboardingStep
  steps_completed: OnboardingStep[]
  professional_data: ProfessionalData
  preferences_data: PreferencesData
  skills_data: SkillsData
  started_at: IsoString
  completed_at: IsoString | null
  updated_at: IsoString
}

// 10. Audit Activity
export interface TeamActivityEvent {
  id: Uuid
  project_id: Uuid
  actor_id: Uuid | null
  subject_member_id: Uuid | null
  event_type: string
  title: string
  summary: string | null
  metadata: Record<string, any>
  created_at: IsoString
}

// 11. Settings
export interface TeamSettings {
  project_id: Uuid
  who_can_invite: 'owner' | 'leads' | 'anyone'
  invitation_expiration_days: number
  require_work_plan_confirm: boolean
  require_profile_completion: boolean
  access_review_cadence_days: number
  onboarding_required_fields: OnboardingStep[]
  team_visibility: 'project_visibility' | 'members_only' | 'private'
  custom_role_creation_allowed: boolean
  auto_notify_workload_alerts: boolean
  created_at: IsoString
  updated_at: IsoString
}