// ============================================================================
// PROJECT EXPLORE — Types & Contracts
// ============================================================================

export interface ExploreProjectCard {
  id: string
  slug: string
  name: string
  tagline?: string | null
  short_description?: string | null
  description?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
  icon?: string | null
  color?: string | null
  stage?: string | null
  status?: string | null
  industry?: string | null
  sector?: string | null
  location?: string | null
  project_type?: string | null
  project_number?: string | null

  team_size?: number | null
  open_roles?: number | null
  follower_count?: number | null
  view_count?: number | null
  save_count?: number | null

  is_dsrt_verified?: boolean
  is_open_source?: boolean
  is_hiring?: boolean
  license?: string | null

  category?: string[] | null       // Legacy string tags
  tech_stack?: string[] | null     // Legacy tech tags

  // Normalized taxonomy fields (from M:N tables)
  domains?: string[]               // Domain names from project_domain_assignments
  technologies?: string[]          // Tech names from project_technology_assignments
  primary_domain?: string | null

  // Repository metadata
  repository_url?: string | null
  repository_stars?: number | null
  repository_contributors?: number | null

  // Collaboration
  collaboration_status?: 'solo' | 'has_collaborators' | 'looking_for_collaborators' | 'open_to_contributors' | null
  parent_venture_id?: string | null

  last_activity_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  published_at?: string | null

  founder?: {
    id: string
    full_name: string
    username: string
    avatar_url?: string | null
    is_verified?: boolean
  } | null

  // Recommendation metadata
  reason_code?: string
  reason_label?: string
  is_following?: boolean
  is_saved?: boolean

  // Algorithm internals (never shown to user)
  _score?: number
  _bayesian?: number
  _growth?: number
  _session_boost?: number
  _matched_domains?: string[]
  _matched_technologies?: string[]
}

export interface ExploreProjectModule {
  id: string
  type:
    | 'recommended'
    | 'rising'
    | 'domain_affinity'
    | 'technology_affinity'
    | 'new_and_notable'
    | 'catalog'
    | 'following'
    | 'editorial'
    | 'open_source'
    | 'looking_for_collaborators'
  title: string
  subtitle?: string
  reason?: string
  items: ExploreProjectCard[]
  see_all_href?: string
}

export interface ExploreProjectFeedResponse {
  modules: ExploreProjectModule[]
  next_cursor?: string | null
  total_candidates?: number
  ranking_version?: string
}

export interface ExploreProjectFilterState {
  search?: string
  domains?: string[]            // Domain names
  domain_slugs?: string[]       // Domain slugs (canonical)
  technologies?: string[]        // Technology names
  technology_slugs?: string[]    // Technology slugs (canonical)
  project_types?: string[]
  stages?: string[]
  licenses?: string[]
  locations?: string[]
  visibility?: string[]          // 'public' | 'dsrt_members' | 'private'
  is_open_source?: boolean
  is_hiring?: boolean
  is_looking_for_collaborators?: boolean
  is_verified?: boolean
  is_newly_launched?: boolean
  has_repository?: boolean
  sort?: 'recommended' | 'rising' | 'newest' | 'updated' | 'most_followed' | 'most_active'
  cursor?: string
}

export interface ProjectFacetCounts {
  domains?: Record<string, number>
  technologies?: Record<string, number>
  project_types?: Record<string, number>
  stages?: Record<string, number>
  licenses?: Record<string, number>
  flags?: {
    open_source?: number
    looking_for_collaborators?: number
    hiring?: number
    dsrt_verified?: number
  }
}

// ─── Recommendation reason codes (matches spec §71) ───
export const REASON_CODES = {
  DOMAIN_AFFINITY: 'DOMAIN_AFFINITY',
  TECHNOLOGY_AFFINITY: 'TECHNOLOGY_AFFINITY',
  SESSION_INTENT: 'SESSION_INTENT',
  RISING: 'RISING',
  NEW_AND_RELEVANT: 'NEW_AND_RELEVANT',
  NETWORK_SIGNAL: 'NETWORK_SIGNAL',
  OPEN_SOURCE: 'OPEN_SOURCE',
  LOOKING_FOR_COLLABORATORS: 'LOOKING_FOR_COLLABORATORS',
  EDITORIAL_PICK: 'EDITORIAL_PICK',
  VERIFIED: 'VERIFIED',
} as const

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES]

export interface RecommendationContext {
  userId?: string
  sessionId?: string
  variant?: string
}