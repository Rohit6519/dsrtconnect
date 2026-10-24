// ============================================================
// lib/operations/types.ts
// ============================================================

export const QUESTION_TYPES = [
  'SHORT_TEXT', 'LONG_TEXT', 'EMAIL', 'PHONE', 'NUMBER',
  'DATE', 'TIME', 'DATETIME',
  'SINGLE_SELECT', 'MULTI_SELECT', 'DROPDOWN',
  'BOOLEAN', 'RATING',
  'URL', 'FILE', 'IMAGE',
  'COUNTRY', 'CITY', 'SKILLS',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'
export type SubmissionStatus =
  | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED' | 'EXPIRED'

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED'

export interface FormQuestionInput {
  key: string
  label: string
  description?: string
  type: QuestionType
  required?: boolean
  position?: number
  placeholder?: string
  default_value?: any
  validation_rules?: {
    min?: number
    max?: number
    min_length?: number
    max_length?: number
    pattern?: string
    max_file_size?: number
    accept_mime?: string[]
  }
  options?: Array<{ value: string; label: string }>
  metadata?: Record<string, unknown>
  section_key?: string
}

export interface FormRuleInput {
  rule_type: 'SHOW_IF' | 'HIDE_IF' | 'REQUIRE_IF'
  target_question_key: string
  condition: {
    question_key: string
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IS_TRUTHY' | 'IS_EMPTY'
    value?: any
  }
}

export interface WorkflowStateInput {
  key: string
  name: string
  description?: string
  is_initial?: boolean
  is_terminal?: boolean
  color_token?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple'
  position?: number
}

export interface WorkflowTransitionInput {
  key: string
  label: string
  from_state_key: string
  to_state_key: string
  required_permission?: string
  guard_conditions?: any
  actions?: Array<{
    action_type: string
    params?: Record<string, unknown>
    run_async?: boolean
    position?: number
  }>
}