export type TeamUpSourceType = 'team_up' | 'venture_lf' | 'project_role'
export type TeamUpContextType = 'personal' | 'project' | 'venture' | 'organization'
export type TeamUpRequestType =
  | 'hiring' | 'jobs' | 'collaborate' | 'join_project' | 'join_venture'
  | 'cofounder' | 'advisor' | 'mentor' | 'research'
  | 'expert_help' | 'open_contribution' | 'volunteer' | 'other'

export type TeamUpStatus =
  | 'draft' | 'published' | 'active' | 'paused'
  | 'closing_soon' | 'filled' | 'closed' | 'archived' | 'open'

export type PipelineStage =
  | 'applied' | 'under_review' | 'shortlisted'
  | 'interview' | 'offer' | 'accepted' | 'rejected' | 'withdrawn'

export type TeamUpSort = 'best_match' | 'recent' | 'popular' | 'deadline' | 'activity'

export interface TeamUpBanner {
  id: string
  position: number
  image_url: string
  title: string | null
  subtitle: string | null
  cta_label: string | null
  cta_url: string | null
  is_active: boolean
}

export interface TeamUpOwner {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline?: string | null
  is_verified?: boolean
  follower_count?: number
}

export interface TeamUpVenture {
  id: string
  slug: string
  name: string
  logo_url: string | null
  tagline?: string | null
}

export interface TeamUpProject {
  id: string
  slug: string
  name: string
  logo_url: string | null
  tagline?: string | null
  icon?: string | null
}

export interface TeamUpItem {
  id: string
  source_type: TeamUpSourceType
  source_id: string
  slug: string | null
  reference_number: string | null
  owner_id: string
  context_type: TeamUpContextType
  project_id: string | null
  venture_id: string | null
  organization_id: string | null
  request_type: TeamUpRequestType | string
  title: string
  tagline: string | null
  description: string | null
  what_youll_do: string | null
  required_skills: string[]
  nice_to_have_skills: string[]
  responsibilities: string[]
  commitment: string | null
  work_mode: string | null
  location: string | null
  hours_per_week: number | null
  positions_open: number
  application_deadline: string | null
  experience_level: string | null
  compensation_type: string | null
  compensation_hidden: boolean
  industry: string | null
  sector: string | null
  status: TeamUpStatus | string
  urgency: string | null
  is_featured: boolean
  is_verified: boolean
  view_count: number
  application_count: number
  save_count: number
  published_at: string | null
  last_activity_at: string | null
  created_at: string
  cover_image_url?: string | null
  subline?: string | null
  content_blocks?: any
  content_html?: string | null
  role_category?: string | null
  employment_type?: string | null
  owner?: TeamUpOwner | null
  venture?: TeamUpVenture | null
  project?: TeamUpProject | null
  has_applied?: boolean
  is_saved?: boolean
  custom_questions?: any[]
  match_score?: number
}

export interface TeamUpFilters {
  type?: string
  skills?: string[]
  industry?: string
  commitment?: string
  work_mode?: string
  experience?: string
  location?: string
  status?: string
  q?: string
  sort?: TeamUpSort
}

export interface TeamUpApplication {
  id: string
  applicant_id: string
  request_id: string | null
  venture_lf_id: string | null
  project_role_id: string | null
  source_type: TeamUpSourceType
  pipeline_stage: PipelineStage
  status: string
  message: string | null
  cover_letter: string | null
  resume_url: string | null
  portfolio_url: string | null
  github_url: string | null
  linkedin_url: string | null
  availability: string | null
  expected_hours: number | null
  answers: Record<string, any>
  internal_notes: string | null
  internal_rating: number | null
  is_starred: boolean
  reviewer_notes: string | null
  stage_updated_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
  applicant?: TeamUpOwner
  opportunity?: any
  context?: any
  skills?: string[]
  score?: {
    total_score: number
    skill_match_score: number
    industry_match_score: number
  }
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  hiring: 'Hiring',
  jobs: 'Jobs',
  collaborate: 'Collaborate',
  join_project: 'Join a Project',
  join_venture: 'Join a Venture',
  cofounder: 'Co-founder',
  expert_help: 'Expertise',
  research: 'Research',
  advisor: 'Advisors',
  mentor: 'Mentors',
  volunteer: 'Volunteer',
  other: 'Other',
  open_contribution: 'Open Contribution',
}

export const COMMITMENT_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  volunteer: 'Volunteer',
  flexible: 'Flexible',
  'one-time': 'One-time',
  'long-term': 'Long-term',
}

export const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}
