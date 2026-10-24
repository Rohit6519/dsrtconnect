import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserIntelligenceProfile } from '@/lib/algorithm/intelligence-profile'
import { scorePostForUser, applyDiversityFilter } from '@/lib/algorithm/recommendation-engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/home/feed
 * Tabs: 'for-you' | 'latest' | 'ventures' | 'projects'
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'for-you'
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 40)

  try {
    // Fetch bot IDs to exclude (safety net even if bots deleted)
    const { data: bots } = await supabase.from('users').select('id').eq('is_bot', true)
    const botIds = (bots || []).map(b => b.id)

    const baseSelect = `
      id, publisher_type, publisher_id, user_id, type, title,
      content, content_text, content_html, content_blocks,
      media_urls, image_urls, video_url, tags, link_url, link_title,
      link_description, link_image, visibility, event_date, event_location,
      is_pinned, edited_at, repost_of_id, quote_of_id,
      comments_permission, is_sensitive, content_warning,
      like_count, comment_count, share_count, view_count,
      bookmark_count, reaction_count, repost_count, quote_count,
      created_at, updated_at, is_published_at
    `

    // ══════════════════════════════════════════════════════════
    // STRATEGY 1: LATEST FEED — Pure chronological
    // ══════════════════════════════════════════════════════════
    if (tab === 'latest') {
      let query = supabase
        .from('posts')
        .select(baseSelect)
        .eq('visibility', 'global')
        .or('is_draft.is.null,is_draft.eq.false')
        .order('created_at', { ascending: false })
        .limit(limit + 1)

      if (cursor) query = query.lt('created_at', cursor)
      if (botIds.length > 0) query = query.not('user_id', 'in', `(${botIds.join(',')})`)

      const { data: rows, error } = await query
      if (error) throw error

      return await hydrateAndReturn(supabase, user, rows || [], limit)
    }

    // ══════════════════════════════════════════════════════════
    // STRATEGY 2: VENTURES FEED — Venture-only posts
    // ══════════════════════════════════════════════════════════
    if (tab === 'ventures') {
      let query = supabase
        .from('posts')
        .select(baseSelect)
        .eq('visibility', 'global')
        .eq('publisher_type', 'venture')
        .or('is_draft.is.null,is_draft.eq.false')
        .order('created_at', { ascending: false })
        .limit(limit + 1)

      if (cursor) query = query.lt('created_at', cursor)
      if (botIds.length > 0) query = query.not('user_id', 'in', `(${botIds.join(',')})`)

      const { data: rows, error } = await query
      if (error) throw error

      return await hydrateAndReturn(supabase, user, rows || [], limit)
    }

    // ══════════════════════════════════════════════════════════
    // STRATEGY 3: PROJECTS FEED — Project-only posts
    // ══════════════════════════════════════════════════════════
    if (tab === 'projects') {
      let query = supabase
        .from('posts')
        .select(baseSelect)
        .eq('visibility', 'global')
        .eq('publisher_type', 'project')
        .or('is_draft.is.null,is_draft.eq.false')
        .order('created_at', { ascending: false })
        .limit(limit + 1)

      if (cursor) query = query.lt('created_at', cursor)
      if (botIds.length > 0) query = query.not('user_id', 'in', `(${botIds.join(',')})`)

      const { data: rows, error } = await query
      if (error) throw error

      return await hydrateAndReturn(supabase, user, rows || [], limit)
    }

    // ══════════════════════════════════════════════════════════
    // STRATEGY 4 (DEFAULT): FOR YOU — Personalized ranking
    // ══════════════════════════════════════════════════════════
    // Fetch broad candidate pool for scoring
    let query = supabase
      .from('posts')
      .select(baseSelect)
      .eq('visibility', 'global')
      .or('is_draft.is.null,is_draft.eq.false')
      .order('created_at', { ascending: false })
      .limit(user ? 80 : limit + 1) // Wider pool for personalization

    if (cursor) query = query.lt('created_at', cursor)
    if (botIds.length > 0) query = query.not('user_id', 'in', `(${botIds.join(',')})`)

    const { data: rows, error } = await query
    if (error) throw error

    return await hydrateAndReturn(supabase, user, rows || [], limit, /* personalize */ true)
  } catch (e: any) {
    console.error('Feed error:', e)
    return NextResponse.json({ posts: [], nextCursor: null, hasMore: false, error: e?.message }, { status: 500 })
  }
}

/**
 * Hydrates posts with publisher data + user interaction states.
 * Optionally applies personalization for the For You feed.
 */
async function hydrateAndReturn(
  supabase: any,
  user: any,
  rows: any[],
  limit: number,
  personalize: boolean = false
) {
  if (rows.length === 0) {
    return NextResponse.json({ posts: [], nextCursor: null, hasMore: false })
  }

  const publisherKeys = rows.map(p => ({ type: p.publisher_type, id: p.publisher_id }))
  const userIds = [...new Set(publisherKeys.filter(k => k.type === 'person').map(k => k.id))]
  const ventureIds = [...new Set(publisherKeys.filter(k => k.type === 'venture').map(k => k.id))]
  const projectIds = [...new Set(publisherKeys.filter(k => k.type === 'project').map(k => k.id))]
  const communityIds = [...new Set(publisherKeys.filter(k => k.type === 'community').map(k => k.id))]

  const [usersRes, venturesRes, projectsRes, communitiesRes, authorsRes] = await Promise.all([
    userIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, tagline, is_verified, follower_count').in('id', userIds) : { data: [] },
    ventureIds.length ? supabase.from('ventures').select('id, slug, name, logo_url, tagline, is_verified, follower_count').in('id', ventureIds) : { data: [] },
    projectIds.length ? supabase.from('projects').select('id, slug, name, cover_image_url, tagline, follower_count, icon').in('id', projectIds) : { data: [] },
    communityIds.length ? supabase.from('communities').select('id, slug, name, cover_url, description, member_count, icon, is_verified').in('id', communityIds) : { data: [] },
    supabase.from('users').select('id, username, full_name, avatar_url').in('id', [...new Set(rows.map(p => p.user_id).filter(Boolean))]),
  ])

  const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]))
  const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))
  const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
  const communityMap = new Map((communitiesRes.data || []).map((c: any) => [c.id, c]))
  const authorMap = new Map((authorsRes.data || []).map((u: any) => [u.id, u]))

  let reactedIds = new Set<string>()
  let bookmarkedIds = new Set<string>()
  let repostedIds = new Set<string>()

  if (user) {
    const postIds = rows.map(p => p.id)
    const [reactRes, bookmarkRes, repostRes] = await Promise.all([
      supabase.from('post_reactions').select('post_id, reaction_type').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('post_reposts').select('original_post_id').eq('reposter_user_id', user.id).in('original_post_id', postIds),
    ])
    reactedIds = new Set((reactRes.data || []).map((r: any) => r.post_id))
    bookmarkedIds = new Set((bookmarkRes.data || []).map((b: any) => b.post_id))
    repostedIds = new Set((repostRes.data || []).map((r: any) => r.original_post_id))
  }

  const hydrated = rows.map((p: any) => {
    let publisher: any = null
    if (p.publisher_type === 'person') {
      const u = userMap.get(p.publisher_id) as any
      if (u) publisher = { type: 'person', id: u.id, name: u.full_name, handle: u.username, avatar_url: u.avatar_url, tagline: u.tagline, is_verified: u.is_verified, follower_count: u.follower_count, slug: u.username }
    } else if (p.publisher_type === 'venture') {
      const v = ventureMap.get(p.publisher_id) as any
      if (v) publisher = { type: 'venture', id: v.id, name: v.name, handle: v.slug, avatar_url: v.logo_url, tagline: v.tagline, is_verified: v.is_verified, follower_count: v.follower_count, slug: v.slug }
    } else if (p.publisher_type === 'project') {
      const pr = projectMap.get(p.publisher_id) as any
      if (pr) publisher = { type: 'project', id: pr.id, name: pr.name, handle: pr.slug, avatar_url: pr.cover_image_url, tagline: pr.tagline, follower_count: pr.follower_count, slug: pr.slug, icon: pr.icon }
    } else if (p.publisher_type === 'community') {
      const c = communityMap.get(p.publisher_id) as any
      if (c) publisher = { type: 'community', id: c.id, name: c.name, handle: c.slug, avatar_url: c.cover_url, tagline: c.description, is_verified: c.is_verified, follower_count: c.member_count, slug: c.slug, icon: c.icon }
    }

    return {
      ...p,
      publisher,
      author: authorMap.get(p.user_id) || null,
      is_reacted: reactedIds.has(p.id),
      is_bookmarked: bookmarkedIds.has(p.id),
      is_reposted: repostedIds.has(p.id),
    }
  })

  let finalPosts: any[] = hydrated
  let hasMore = hydrated.length > limit

  // Apply Personalization (For You tab only, when user logged in)
  if (personalize && user) {
    const profile = await getUserIntelligenceProfile(supabase, user.id)
    const scored = hydrated.map(p => scorePostForUser(p, profile))
    scored.sort((a, b) => b.score - a.score)

    const diversified = applyDiversityFilter(scored)
    finalPosts = diversified.slice(0, limit).map(item => item.post)
    hasMore = diversified.length > limit
  } else {
    finalPosts = hydrated.slice(0, limit)
    hasMore = hydrated.length > limit
  }

  const nextCursor = hasMore && finalPosts.length > 0
    ? finalPosts[finalPosts.length - 1]?.created_at
    : null

  return NextResponse.json({
    posts: finalPosts,
    nextCursor,
    hasMore,
  })
}