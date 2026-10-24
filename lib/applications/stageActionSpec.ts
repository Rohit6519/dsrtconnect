import type { PipelineStage } from './types'

export interface StageActionSpec {
  key: PipelineStage
  title: string
  verb: string                   // button label
  description: string
  intent: 'neutral' | 'positive' | 'warn' | 'danger'
  defaultNotifyCandidate: boolean
  confirmationRequired: boolean  // require explicit typed confirm for dangerous actions
  nextSteps: NextStepOption[]
}

export interface NextStepOption {
  key: string
  label: string
  hint?: string
}

/** Canonical action list surfaced by the Command Center */
export const STAGE_ACTIONS: Record<string, StageActionSpec> = {
  reviewing: {
    key: 'reviewing',
    title: 'Move to Reviewing',
    verb: 'Move to Reviewing',
    description: "Marks this application as actively being reviewed by your team.",
    intent: 'neutral',
    defaultNotifyCandidate: false,
    confirmationRequired: false,
    nextSteps: [
      { key: 'none',            label: 'No next step' },
      { key: 'assign_reviewer', label: 'Assign a reviewer',            hint: 'You can pick from your team' },
      { key: 'add_note',        label: 'Add an internal note',         hint: 'Private, never sent to candidate' },
    ],
  },

  screening: {
    key: 'screening',
    title: 'Shortlist Applicant',
    verb: 'Shortlist',
    description: 'Advances the applicant to shortlist and (optionally) sends a shortlist email.',
    intent: 'positive',
    defaultNotifyCandidate: true,
    confirmationRequired: false,
    nextSteps: [
      { key: 'none',                 label: 'No next step' },
      { key: 'request_availability', label: 'Request availability',    hint: 'Candidate is asked to share time slots' },
      { key: 'schedule_interview',   label: 'Schedule interview now',  hint: 'Opens the interview scheduler (Phase 4)' },
    ],
  },

  interviewing: {
    key: 'interviewing',
    title: 'Move to Interview',
    verb: 'Move to Interview',
    description: 'Advances to interviewing stage and prepares invite communication.',
    intent: 'positive',
    defaultNotifyCandidate: true,
    confirmationRequired: false,
    nextSteps: [
      { key: 'none',               label: 'No next step' },
      { key: 'schedule_interview', label: 'Schedule now',              hint: 'Opens the interview scheduler (Phase 4)' },
    ],
  },

  offered: {
    key: 'offered',
    title: 'Move to Offer',
    verb: 'Move to Offer',
    description: 'Marks the candidate as being offered a role. Full Offer packet in Phase 8.',
    intent: 'positive',
    defaultNotifyCandidate: true,
    confirmationRequired: false,
    nextSteps: [
      { key: 'none',          label: 'No next step' },
      { key: 'prepare_offer', label: 'Prepare offer draft', hint: 'Opens offer prep (Phase 8)' },
    ],
  },

  hired: {
    key: 'hired',
    title: 'Select Candidate',
    verb: 'Select',
    description: 'Selects the candidate. This is a permanent hiring decision until reopened.',
    intent: 'positive',
    defaultNotifyCandidate: true,
    confirmationRequired: true,
    nextSteps: [
      { key: 'none',       label: 'No next step' },
      { key: 'onboarding', label: 'Kick off onboarding', hint: 'Opens onboarding flow (Phase 5+)' },
    ],
  },

  rejected: {
    key: 'rejected',
    title: 'Reject Application',
    verb: 'Reject',
    description: 'Rejects the application. The rejection email is fully editable before sending.',
    intent: 'danger',
    defaultNotifyCandidate: true,
    confirmationRequired: true,
    nextSteps: [
      { key: 'none',    label: 'No next step' },
      { key: 'archive', label: 'Archive after 30 days', hint: 'Coming with retention rules' },
    ],
  },
}

export function getStageAction(stage: PipelineStage): StageActionSpec | null {
  return STAGE_ACTIONS[stage] || null
}

/** Rejection reason presets (candidate NEVER sees these — internal only) */
export const REJECT_REASONS = [
  { key: 'requirements_mismatch', label: 'Requirements mismatch' },
  { key: 'experience_mismatch',   label: 'Experience mismatch' },
  { key: 'availability_mismatch', label: 'Availability mismatch' },
  { key: 'role_filled',           label: 'Role filled' },
  { key: 'stronger_candidates',   label: 'Stronger candidates chosen' },
  { key: 'not_proceeding_after_screening', label: 'Not proceeding after screening' },
  { key: 'not_proceeding_after_interview', label: 'Not proceeding after interview' },
  { key: 'other',                 label: 'Other' },
]