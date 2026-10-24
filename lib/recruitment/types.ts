export type TemplateScope = 'global' | 'organization' | 'opportunity'

export type TemplateSendMode = 'automatic' | 'approve' | 'manual'

export type TemplateCategory =
  | 'application'
  | 'stage'
  | 'shortlist'
  | 'interview'
  | 'decision'
  | 'offer'
  | 'other'

export interface RecruitmentTemplate {
  id: string
  template_key: string
  scope: TemplateScope
  organization_id: string | null
  opportunity_id: string | null
  name: string
  description: string | null
  subject: string
  body_markdown: string
  send_mode: TemplateSendMode
  is_active: boolean
  is_default: boolean
  is_system: boolean
  category: TemplateCategory | string
  language: string
  version: number
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  key: string
  category: string
  label: string
  description: string | null
  example: string | null
  resolver: string
  is_safe: boolean
  is_deprecated: boolean
}

export interface RenderContext {
  application_id: string
  opportunity_id: string
  actor_id?: string | null

  // Overrides captured from Command Center drawer
  override_subject?: string
  override_body?: string
  next_step_label?: string

  // Optional interview/offer scoped data (Phase 4/8)
  interview?: {
    date?: string
    time?: string
    link?: string
    duration_min?: number
  }
  offer?: {
    compensation?: string
    start_date?: string
  }
}

export interface RenderedTemplate {
  template_id: string | null      // null when pure override
  template_key: string
  scope_used: TemplateScope | 'override'
  subject: string
  body_markdown: string
  variables_used: Record<string, string | null>
  variables_missing: string[]
  used_override: boolean
}