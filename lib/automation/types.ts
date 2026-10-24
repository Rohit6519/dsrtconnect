export type StepKind = 'condition' | 'action' | 'delay'

export interface Step {
  kind: StepKind
  key: string
  config: Record<string, any>
}

export type TriggerType =
  | 'application_submitted'
  | 'application_withdrawn'
  | 'stage_changed'
  | 'interview_scheduled'
  | 'interview_cancelled'
  | 'interview_completed'
  | 'communication_replied'
  | 'note_added'
  | 'reviewer_assigned'

export interface WorkflowRule {
  id: string
  opportunity_id: string | null
  organization_id: string | null
  owner_id: string
  name: string
  description: string | null
  trigger_type: TriggerType
  trigger_config: Record<string, any>
  steps: Step[]
  is_active: boolean
  is_system: boolean
  is_template: boolean
  version: number
  last_run_at: string | null
  runs_total: number
  runs_success: number
  runs_failed: number
  created_at: string
  updated_at: string
}

export interface AutomationContext {
  application_id: string
  opportunity_id: string
  triggering_event_id: string | null
  event: any                       // full workflow_event row
  metadata: Record<string, any>
}