// types/community.ts

export interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  icon: string | null
  icon_color: string | null
  cover_url: string | null
  tags: string[] | null
  member_count: number
  post_count: number
  project_count?: number
  venture_count?: number
  is_verified: boolean
  is_public: boolean
  is_featured?: boolean
  institution_id: string | null
  created_at: string
  updated_at?: string
  // Enrichment fields
  is_joined?: boolean
  is_saved?: boolean
  match_score?: number
  match_reasons?: string[]
  growth_pct?: number
  is_new?: boolean
}

export interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: 'member' | 'moderator' | 'admin' | 'owner'
  joined_at: string
}

export interface CommunityCategory {
  slug: string
  label: string
  icon: string
  color: string
  community_count: number
  member_count?: number
  is_trending?: boolean
}

export interface DiscoverStats {
  total_communities: number
  total_members: number
  total_projects: number
  total_ventures: number
  total_looking_for: number
  total_countries: number
}

export interface CommunityActivity {
  id: string
  type: string
  icon: string
  color: string
  title: string
  subtitle?: string
  community_name: string
  community_slug: string
  created_at: string
}

export interface DiscoverFeedItem {
  type: 'community' | 'project' | 'builder'
  data: any
}