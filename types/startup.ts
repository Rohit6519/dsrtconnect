export type StartupStage = 
  | 'idea' 
  | 'building' 
  | 'mvp' 
  | 'launched' 
  | 'growing' 
  | 'funded'

export type StartupStatus = 
  | 'active' 
  | 'paused' 
  | 'closed' 
  | 'acquired'

export interface Startup {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  website: string | null
  stage: StartupStage
  category: string[]
  status: StartupStatus
  founded_date: string | null
  institution_id: string | null
  founder_id: string
  follower_count: number
  member_count: number
  milestone_count: number
  is_verified: boolean
  is_hiring: boolean
  is_open: boolean
  created_at: string
  updated_at: string
}

export interface StartupMember {
  id: string
  startup_id: string
  user_id: string
  role: string
  title: string | null
  joined_date: string | null
  left_date: string | null
  status: 'active' | 'left' | 'invited' | 'pending'
  equity: boolean
  created_at: string
}

export interface StartupRole {
  id: string
  startup_id: string
  title: string
  description: string | null
  skills_needed: string[]
  brings: string[]
  commitment: string | null
  equity: boolean
  paid: boolean
  status: 'open' | 'filled' | 'closed'
  applicants: number
  created_at: string
}

export interface StartupMilestone {
  id: string
  startup_id: string
  title: string
  description: string | null
  achieved_date: string | null
  status: 'achieved' | 'target'
  is_public: boolean
  created_at: string
}