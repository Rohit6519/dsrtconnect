export type UserRole =
  | 'visionary'
  | 'builder'
  | 'launcher'
  | 'maker'
  | 'professional'
  | 'mentor'

export type Availability =
  | 'full-time'
  | 'part-time'
  | 'weekends'
  | 'not-available'

export interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  tagline: string | null
  location: string | null
  website: string | null
  github_url: string | null
  twitter_url: string | null
  linkedin_url: string | null
  brings: UserRole[]
  seeking: string[]
  interest_topics: string[]
  availability: Availability | null
  is_verified: boolean
  is_mentor: boolean
  is_professional: boolean
  execution_score: number
  contribution_hours: number
  products_shipped: number
  streak_days: number
  last_active: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  name: string
  slug: string
  category: string
}

export interface UserSkill {
  id: string
  user_id: string
  skill_id: string
  level: 'learning' | 'intermediate' | 'strong' | 'expert'
  verified: boolean
  skills: Skill
}

export interface Institution {
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
  cover_url: string | null
  location: string | null
  city: string | null
  state: string | null
  country: string
  type: string
  website: string | null
  verified: boolean
  member_count: number
  created_at: string
}

export interface UserEducation {
  id: string
  user_id: string
  institution_id: string | null
  institution_name: string | null
  degree: string | null
  field: string | null
  start_year: number | null
  end_year: number | null
  is_current: boolean
  grade: string | null
  description: string | null
  institutions?: Institution
}

export interface UserExperience {
  id: string
  user_id: string
  company: string
  role: string
  type: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  is_current: boolean
  description: string | null
}

export interface JourneyEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  category:
    | 'education'
    | 'startup'
    | 'project'
    | 'career'
    | 'achievement'
    | 'community'
    | 'goal'
  status: 'completed' | 'in_progress' | 'goal'
  is_auto: boolean
  is_approved: boolean
  entity_type: string | null
  entity_id: string | null
  visible: boolean
  created_at: string
}