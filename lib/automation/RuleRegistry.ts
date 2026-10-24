import type { TriggerType, Step } from './types'

// ─── Triggers ───────────────────────────────────────────────
export interface TriggerDef {
  key: TriggerType
  label: string
  description: string
  supports_filters: string[]        // trigger_config keys the builder can offer
}

export const TRIGGERS: TriggerDef[] = [
  { key: 'application_submitted', label: 'Application submitted',       description: 'A candidate finished and submitted their application.', supports_filters: [] },
  { key: 'application_withdrawn', label: 'Application withdrawn',       description: 'A candidate withdrew their application.',              supports_filters: [] },
  { key: 'stage_changed',         label: 'Stage changed',                description: 'Application pipeline stage changed to specific value.', supports_filters: ['to_stage', 'from_stage'] },
  { key: 'interview_scheduled',   label: 'Interview scheduled',          description: 'An interview was created for the application.',        supports_filters: [] },
  { key: 'interview_cancelled',   label: 'Interview cancelled',          description: 'An interview was cancelled.',                          supports_filters: [] },
  { key: 'interview_completed',   label: 'Interview completed',          description: 'An interview was marked complete.',                    supports_filters: [] },
  { key: 'communication_replied', label: 'Candidate replied',            description: 'Candidate sent a message on the application thread.',  supports_filters: [] },
  { key: 'note_added',            label: 'Note added by reviewer',       description: 'An internal note was added.',                          supports_filters: [] },
  { key: 'reviewer_assigned',     label: 'Reviewer assigned',            description: 'A reviewer was assigned to the application.',          supports_filters: [] },
]

// ─── Conditions ─────────────────────────────────────────────
export interface ConditionDef {
  key: string
  label: string
  description: string
  fields: FieldSpec[]
}

export interface FieldSpec {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'stage' | 'timezone' | 'boolean'
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
}

export const CONDITIONS: ConditionDef[] = [
  {
    key: 'stage_equals',
    label: 'Stage is currently',
    description: 'Only continue if the application is currently in a specific stage.',
    fields: [{ key: 'stage', label: 'Stage', type: 'stage', required: true }],
  },
  {
    key: 'stage_in',
    label: 'Stage is one of',
    description: 'Only continue if the current stage matches one of a set.',
    fields: [{ key: 'stages', label: 'Stages (comma-separated)', type: 'text', required: true, placeholder: 'reviewing, screening' }],
  },
  {
    key: 'has_scheduled_interview',
    label: 'Has a scheduled interview',
    description: 'Only continue if the application has at least one confirmed interview.',
    fields: [],
  },
  {
    key: 'no_availability_shared',
    label: 'Candidate has not shared availability',
    description: 'Continue only if there are no candidate availability slots.',
    fields: [],
  },
  {
    key: 'candidate_replied_recently',
    label: 'Candidate replied within (hours)',
    description: 'Continue only if the candidate has sent a message in the last N hours.',
    fields: [{ key: 'hours', label: 'Hours', type: 'number', required: true }],
  },
  {
    key: 'interview_still_scheduled',
    label: 'Interview is still scheduled',
    description: 'Continue only if the interview from the trigger has not been cancelled or completed.',
    fields: [],
  },
  {
    key: 'is_verified_candidate',
    label: 'Candidate is verified',
    description: 'Continue only for verified DSRT builders.',
    fields: [],
  },
]

// ─── Actions ────────────────────────────────────────────────
export interface ActionDef {
  key: string
  label: string
  description: string
  fields: FieldSpec[]
  danger?: boolean
}

export const ACTIONS: ActionDef[] = [
  {
    key: 'set_stage',
    label: 'Move application to stage',
    description: 'Transitions the application through WorkflowService.',
    fields: [
      { key: 'stage',            label: 'Target stage',       type: 'stage', required: true },
      { key: 'notify_candidate', label: 'Notify candidate?',  type: 'boolean' },
    ],
  },
  {
    key: 'send_candidate_mail',
    label: 'Send email to candidate',
    description: 'Uses the recruitment template engine (Phase 3).',
    fields: [
      { key: 'template_key',     label: 'Template key',       type: 'text', required: true, placeholder: 'dsrt.stage.screening' },
      { key: 'override_subject', label: 'Override subject',   type: 'text' },
      { key: 'override_body',    label: 'Override body',      type: 'text' },
    ],
  },
  {
    key: 'notify_owner_in_app',
    label: 'Notify owner (in-app)',
    description: 'Adds an in-app notification for the opportunity owner.',
    fields: [{ key: 'reason', label: 'Reason label', type: 'text' }],
  },
  {
    key: 'notify_candidate_in_app',
    label: 'Notify candidate (in-app)',
    description: 'Adds an in-app notification for the candidate.',
    fields: [{ key: 'reason', label: 'Reason label', type: 'text' }],
  },
  {
    key: 'add_internal_note',
    label: 'Add internal note',
    description: 'Adds a private note to the application (owner-only).',
    fields: [{ key: 'body', label: 'Note text', type: 'text', required: true }],
  },
  {
    key: 'assign_reviewer',
    label: 'Assign reviewer',
    description: 'Adds a reviewer to the application.',
    fields: [{ key: 'reviewer_id', label: 'Reviewer user_id', type: 'text', required: true }],
  },
  {
    key: 'cancel_pending_interviews',
    label: 'Cancel pending interviews',
    description: 'Cancels all non-completed interviews for this application.',
    fields: [{ key: 'reason', label: 'Reason', type: 'text' }],
    danger: true,
  },
]

// ─── Delays ────────────────────────────────────────────────
export interface DelayDef {
  key: string
  label: string
  description: string
  fields: FieldSpec[]
}

export const DELAYS: DelayDef[] = [
  {
    key: 'wait',
    label: 'Wait for a duration',
    description: 'Pauses the rule for the given amount of time.',
    fields: [
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'unit',   label: 'Unit',   type: 'select', required: true,
        options: [
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours',   label: 'Hours' },
          { value: 'days',    label: 'Days' },
        ]},
    ],
  },
  {
    key: 'wait_until',
    label: 'Wait until specific event time',
    description: 'Pauses until a related timestamp (e.g. interview.scheduled_at) is reached, with an optional offset.',
    fields: [
      { key: 'relative_to', label: 'Relative to', type: 'select', required: true,
        options: [{ value: 'interview.scheduled_at', label: 'Interview scheduled_at' }] },
      { key: 'offset',      label: 'Offset',      type: 'number', placeholder: '-60 for 60 min before' },
      { key: 'unit',        label: 'Unit',        type: 'select',
        options: [{ value: 'minutes', label: 'Minutes' }, { value: 'hours', label: 'Hours' }] },
    ],
  },
]

// Helpful lookup maps
export const TRIGGER_MAP = Object.fromEntries(TRIGGERS.map(t => [t.key, t]))
export const CONDITION_MAP = Object.fromEntries(CONDITIONS.map(c => [c.key, c]))
export const ACTION_MAP = Object.fromEntries(ACTIONS.map(a => [a.key, a]))
export const DELAY_MAP = Object.fromEntries(DELAYS.map(d => [d.key, d]))

export function validateSteps(steps: Step[]): string | null {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (!s.kind || !s.key) return `Step ${i + 1}: missing kind or key`
    if (s.kind === 'condition' && !CONDITION_MAP[s.key]) return `Step ${i + 1}: unknown condition ${s.key}`
    if (s.kind === 'action'    && !ACTION_MAP[s.key])    return `Step ${i + 1}: unknown action ${s.key}`
    if (s.kind === 'delay'     && !DELAY_MAP[s.key])     return `Step ${i + 1}: unknown delay ${s.key}`
  }
  return null
}