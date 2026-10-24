export interface ExploreVentureCard {
  id: string
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  logo_url?: string | null
  cover_url?: string | null
  stage?: string | null
  status?: string | null
  industry?: string | null
  sector?: string | null
  sub_category?: string | null
  location?: string | null
  venture_type?: string | null
  business_model?: string | null
  funding_stage?: string | null
  team_size?: number | null
  follower_count?: number | null
  view_count?: number | null
  is_verified?: boolean
  is_hiring?: boolean
  seeking_investment?: boolean
  seeking_cofounder?: boolean
  last_activity_at?: string
  created_at?: string
  founder?: {
    id: string
    full_name: string
    username: string
    avatar_url?: string | null
  } | null
  domains?: string[]
  open_roles_count?: number
  reason_code?: string
  reason_label?: string
  is_following?: boolean
  
  // Algorithm internals (hidden from UI)
  _bayesian?: number
  _growth?: number
  _session_boost?: number
  _score?: number
}

export interface ExploreFeedModule {
  id: string
  type: 'recommended' | 'rising' | 'domain_affinity' | 'new_and_notable' | 'catalog' | 'following' | 'editorial'
  title: string
  subtitle?: string
  reason?: string
  items: ExploreVentureCard[]
  see_all_href?: string
}

export interface ExploreFeedResponse {
  modules: ExploreFeedModule[]
  next_cursor?: string | null
  total_candidates?: number
  ranking_version?: string
}

export interface ExploreFilterState {
  search?: string
  domains?: string[]
  sub_categories?: string[]
  stages?: string[]
  locations?: string[]
  venture_types?: string[]
  business_models?: string[]
  team_sizes?: string[]
  funding_stages?: string[]
  is_verified?: boolean
  is_hiring?: boolean
  is_seeking_investment?: boolean
  is_seeking_cofounder?: boolean
  is_active_recently?: boolean
  is_newly_launched?: boolean
  sort?: 'recommended' | 'rising' | 'newest' | 'updated' | 'most_followed' | 'most_active'
  cursor?: string
}

export interface FacetCounts {
  domains?: Record<string, number>
  sub_categories?: Record<string, number>
  stages?: Record<string, number>
  venture_types?: Record<string, number>
  business_models?: Record<string, number>
  funding_stages?: Record<string, number>
  locations?: Record<string, number>
  team_size_ranges?: Record<string, number>
  flags?: {
    verified?: number
    hiring?: number
    investment?: number
    cofounder?: number
  }
}