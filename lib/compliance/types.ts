export type AuditCategory =
  | 'application'
  | 'interview'
  | 'mail'
  | 'note'
  | 'reviewer'
  | 'rule'
  | 'offer'
  | 'opportunity'
  | 'system'
  | 'compliance'

export type AuditSource =
  | 'api'
  | 'bulk_action'
  | 'sidebar_chip'
  | 'kanban_drag'
  | 'automation'
  | 'cron'
  | 'migration'
  | 'command_center'
  | 'submit_endpoint'
  | 'withdraw_endpoint'
  | 'apply_endpoint'

export type ActorRole =
  | 'owner'
  | 'manager'
  | 'reviewer'
  | 'applicant'
  | 'system'
  | 'automation'

export interface AuditInput {
  action: string
  category: AuditCategory
  entity_type: string
  entity_id: string

  opportunity_id?: string | null
  application_id?: string | null
  organization_id?: string | null

  actor_id?: string | null
  actor_role?: ActorRole
  actor_ip?: string | null
  actor_user_agent?: string | null
  actor_session_id?: string | null

  reason?: string | null
  source?: AuditSource

  before_state?: any
  after_state?: any
  diff?: any
  metadata?: Record<string, any>
}

export interface RequestContext {
  actor_id: string | null
  actor_ip: string | null
  actor_user_agent: string | null
  actor_session_id: string | null
}