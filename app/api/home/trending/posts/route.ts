import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  try {
    // Try trending cache first
    const { data: cached } = await supabase
      .from('trending_posts_cache')
      .select('post_id, score')
      .gt('score', 0)
      .order('score', { ascending: false })
      .limit(limit)

    let postIds = (cached || []).map((c: any) => c.post_id)

    // Fallback: if cache is empty, refresh it now
    if (postIds.length === 0) {
      await supabase.rpc('fn_calculate_trending_scores', { p_window_hours: 6 }).catch(() => {})
      const { data: refreshed } = await supabase
        .from('trending_posts_cache')
        .select('post_id, score')
        .gt('score', 0)
        .order('score', { ascending: false })
        .limit(limit)
      postIds = (refreshed || []).map((c: any) => c.post_id)
    }

    // Ultimate fallback: recent posts with any engagement
    if (postIds.length === 0) {
      const { data: fb } = await supabase.from('posts')
        .select('id')
        .eq('visibility', 'global')
        .or('is_draft.is.null,is_draft.eq.false')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('reaction_count', { ascending: false, nullsFirst: false })
        .limit(limit)
      postIds = (fb || []).map((p: any) => p.id)
    }

    if (postIds.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    // Hydrate posts with publisher enrichment (same as feed API)
    const { data: posts } = await supabase.from('posts')
      .select('*')
      .in('id', postIds)

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    // Preserve score order
    const postMap = new Map(posts.map((p: any) => [p.id, p]))
    const ordered = postIds.map(id => postMap.get(id)).filter(Boolean)

    // Enrich publishers
    const userPubIds = ordered.filter((p: any) => p.publisher_type === 'person').map((p: any) => p.publisher_id)
    const venturePubIds = ordered.filter((p: any) => p.publisher_type === 'venture').map((p: any) => p.publisher_id)
    const projectPubIds = ordered.filter((p: any) => p.publisher_type === 'project').map((p: any) => p.publisher_id)

    const [usersRes, venturesRes, projectsRes] = await Promise.all([
      userPubIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, tagline, is_verified').in('id', userPubIds) : { data: [] as any[] },
      venturePubIds.length ? supabase.from('ventures').select('id, slug, name, tagline, logo_url, is_verified').in('id', venturePubIds) : { data: [] as any[] },
      projectPubIds.length ? supabase.from('projects').select('id, slug, name, tagline, cover_image_url, icon').in('id', projectPubIds) : { data: [] as any[] },
    ])

    const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]))
    const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))
    const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))

    let reactedIds = new Set<string>()
    let bookmarkedIds = new Set<string>()
    if (user) {
      const [rr, br] = await Promise.all([
        supabase.from('post_reactions').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      ])
      reactedIds = new Set((rr.data || []).map((r: any) => r.post_id))
      bookmarkedIds = new Set((br.data || []).map((b: any) => b.post_id))
    }

    const enriched = ordered.map((p: any) => {
      let publisher: any = null
      if (p.publisher_type === 'person') {
        const u = userMap.get(p.publisher_id) as any
        if (u) publisher = { type: 'person', id: u.id, name: u.full_name, handle: u.username, avatar_url: u.avatar_url, tagline: u.tagline, is_verified: u.is_verified, slug: u.username }
      } else if (p.publisher_type === 'venture') {
        const v = ventureMap.get(p.publisher_id) as any
        if (v) publisher = { type: 'venture', id: v.id, name: v.name, handle: v.slug, avatar_url: v.logo_url, tagline: v.tagline, is_verified: v.is_verified, slug: v.slug }
      } else if (p.publisher_type === 'project') {
        const pr = projectMap.get(p.publisher_id) as any
        if (pr) publisher = { type: 'project', id: pr.id, name: pr.name, handle: pr.slug, avatar_url: pr.cover_image_url, tagline: pr.tagline, slug: pr.slug, icon: pr.icon }
      }
      return {
        ...p,
        publisher,
        is_reacted: reactedIds.has(p.id),
        is_bookmarked: bookmarkedIds.has(p.id),
      }
    })

    return NextResponse.json({ posts: enriched })
  } catch (e: any) {
    console.error('Trending posts error:', e)
    return NextResponse.json({ posts: [], error: e?.message }, { status: 500 })
  }
}