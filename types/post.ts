export type PostType =
  | 'update'
  | 'idea'
  | 'looking_for'
  | 'i_have'
  | 'build_log'
  | 'milestone'
  | 'launch'
  | 'discussion'
  | 'problem'

export type PostVisibility = 'global' | 'community' | 'followers'

export interface Post {
  id: string
  user_id: string
  startup_id: string | null
  institution_id: string | null
  type: PostType
  content: string
  media_urls: string[]
  tags: string[]
  visibility: PostVisibility
  like_count: number
  comment_count: number
  join_count: number
  share_count: number
  view_count: number
  ai_summary: string | null
  created_at: string
  updated_at: string
  users?: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    tagline: string | null
    brings: string[]
  }
  startups?: {
    id: string
    name: string
    slug: string
    logo_url: string | null
  }
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  content: string
  like_count: number
  created_at: string
  users?: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
  }
}