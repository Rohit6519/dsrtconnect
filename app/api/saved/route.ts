import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all' // all | communities | posts | projects | ventures

  const results: Record<string, any[]> = { communities: [], posts: [], projects: [], ventures: [] }

  // Saved communities
  if (type === 'all' || type === 'communities') {
    const { data } = await supabase
      .from('community_bookmarks')
      .select(`
        saved_at,
        communities:community_id (
          id, name, slug, description, category, icon, icon_color, cover_url,
          member_count, post_count, is_verified, tags
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    results.communities = (data || []).map((r: any) => ({ ...r.communities, saved_at: r.saved_at })).filter(Boolean)
  }

  // Bookmarked posts
  if (type === 'all' || type === 'posts') {
    const { data } = await supabase
      .from('post_bookmarks')
      .select(`
        created_at,
        posts:post_id (
          id, title, content, post_category, sector, tags, skills,
          like_count, comment_count, created_at, user_id,
          users:user_id (id, full_name, username, avatar_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    results.posts = (data || []).map((r: any) => ({ ...r.posts, saved_at: r.created_at })).filter(Boolean)
  }

  return NextResponse.json({
    communities: results.communities,
    posts: results.posts,
    total: results.communities.length + results.posts.length,
  })
}