export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'ENDED' | 'CANCELLED' | 'ARCHIVED'
export type EventVisibility = 'PUBLIC' | 'COMMUNITY' | 'MEMBERS' | 'INVITE_ONLY'
export type RegistrationMode = 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITE_ONLY' | 'CLOSED'
export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW'
export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED'
export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'

export interface CreateEventInput {
  community_id: string
  slug: string
  title: string
  tagline?: string
  description?: string
  event_type?: string
  category?: string
  cover_url?: string
  cover_file_id?: string
  is_online?: boolean
  visibility?: EventVisibility
}

export interface EventScheduleInput {
  starts_at: string
  ends_at?: string
  timezone?: string
  label?: string
  is_primary?: boolean
}

export interface EventLocationInput {
  location_type: 'PHYSICAL' | 'ONLINE' | 'HYBRID'
  name?: string
  address?: string
  city?: string
  country?: string
  meeting_url?: string
  is_primary?: boolean
}

export interface RegistrationConfigInput {
  registration_mode?: RegistrationMode
  capacity?: number | null
  allow_waitlist?: boolean
  waitlist_offer_hours?: number
  registration_opens_at?: string | null
  registration_closes_at?: string | null
  allow_cancellation?: boolean
  cancellation_deadline?: string | null
  show_attendee_list?: boolean
  require_form_submission?: boolean
}