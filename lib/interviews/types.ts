export type InterviewKind =
  | 'screening'
  | 'technical'
  | 'behavioral'
  | 'final'
  | 'portfolio'
  | 'panel'
  | 'followup'
  | 'other'

export type InterviewStatus =
  | 'proposed'
  | 'awaiting_candidate'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type LocationType = 'video' | 'phone' | 'in_person' | 'async'

export type ParticipantRole = 'interviewer' | 'candidate' | 'observer' | 'hiring_manager'
export type ParticipantResponse = 'pending' | 'accepted' | 'declined' | 'tentative'

export type Recommendation = 'strong_no' | 'no' | 'neutral' | 'yes' | 'strong_yes'

export interface ScorecardCriterion {
  key: string
  label: string
  weight?: number
  description?: string
}

export interface CreateInterviewInput {
  application_id: string
  opportunity_id: string
  kind: InterviewKind
  title: string
  description?: string
  scheduled_at?: string | null
  duration_min?: number
  timezone?: string
  location_type: LocationType
  location_url?: string | null
  location_address?: string | null
  location_notes?: string | null
  candidate_message?: string | null
  internal_notes?: string | null
  interviewers: string[]           // user_ids
  hiring_manager_id?: string | null
  send_invitation: boolean
  schedule_reminders: boolean
}