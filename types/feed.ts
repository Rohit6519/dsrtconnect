export type PostType = 
  | 'update'      // General status update
  | 'milestone'   // Achievement/launch
  | 'idea'        // Sharing an idea
  | 'looking_for' // Looking for collaborators
  | 'i_have'      // Offering resources/skills
  | 'question'    // Asking the community

export interface FeedPost {
  id: string
  user_id: string
  type: PostType
  content: string
  image_urls: string[]
  tags: string[]
  link_url?: string
  link_title?: string
  link_description?: string
  link_image?: string
  visibility: 'public' | 'followers' | 'private'
  like_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  created_at: string
  users?: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    tagline: string | null
    brings: string[]
  }
  is_liked?: boolean
  is_bookmarked?: boolean
}