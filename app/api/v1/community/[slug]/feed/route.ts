// ============================================================
// app/api/v1/community/[slug]/feed/route.ts
// Consolidated community feed endpoint.
//
// Old version fired ~10 sequential/parallel queries.
// New version: 4 parallel primary queries + 2 batched enrichment queries.
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildRequestContext,
  ok,
  fail,
  NotFoundError,
  parseCursorParams,
} from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id, visibility')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const { limit, cursor } = parseCursorParams(req.nextUrl.searchParams)

    // -----------------------------------------------------------
    // Stage 1: primary queries in parallel
    // -----------------------------------------------------------
    let feedQuery = supabase
      .from('community_posts_v2')
      .select('*')
      .eq('community_id', community.id)
      .is('deleted_at', null)
      .eq('status', 'PUBLISHED')
      .is('pinned_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1)
    if (cursor) feedQuery = feedQuery.lt('created_at', cursor)

    const [pinnedRes, announcementsRes, feedRes] = await Promise.all([
      supabase
        .from('community_posts_v2')
        .select('*')
        .eq('community_id', community.id)
        .is('deleted_at', null)
        .eq('status', 'PUBLISHED')
        .not('pinned_at', 'is', null)
        .order('pinned_at', { ascending: false })
        .limit(3),
      supabase
        .from('community_announcements')
        .select('*')
        .eq('community_id', community.id)
        .is('deleted_at', null)
        .eq('status', 'PUBLISHED')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(3),
      feedQuery,
    ])

    if (feedRes.error) throw feedRes.error

    const pinned = (pinnedRes.data || []) as any[]
    const announcements = (announcementsRes.data || []) as any[]
    const feedItems = (feedRes.data || []) as any[]

    const hasMore = feedItems.length > limit
    const items = hasMore ? feedItems.slice(0, limit) : feedItems
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? last.created_at : null

    const allPosts = [...pinned, ...items]
    if (allPosts.length === 0 && announcements.length === 0) {
      return ok(
        {
          items: [],
          pinned: [],
          announcements: [],
          next_cursor: null,
          has_more: false,
        },
        { ctx }
      )
    }

    const postIds = allPosts.map((p) => p.id)
    const postAuthorIds = Array.from(new Set(allPosts.map((p) => p.author_identity_id).filter(Boolean)))
    const pollIds = allPosts.map((p) => p.poll_id).filter(Boolean) as string[]
    const annAuthorIds = Array.from(
      new Set(announcements.map((a: any) => a.author_identity_id).filter(Boolean))
    )
    const allAuthorIds = Array.from(new Set([...postAuthorIds, ...annAuthorIds]))

    // -----------------------------------------------------------
    // Stage 2: batched enrichment (in parallel)
    // -----------------------------------------------------------
    const [
      authorsRes,
      attachmentsRes,
      pollsRes,
      optionsRes,
      userReactionsRes,
      userVotesRes,
    ] = await Promise.all([
      allAuthorIds.length > 0
        ? supabase
            .from('users')
            .select('id, username, full_name, avatar_url, is_verified')
            .in('id', allAuthorIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length > 0
        ? supabase
            .from('community_post_attachments')
            .select('*')
            .in('post_id', postIds)
            .order('position', { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
      pollIds.length > 0
        ? supabase.from('community_polls_v2').select('*').in('id', pollIds)
        : Promise.resolve({ data: [] as any[] }),
      pollIds.length > 0
        ? supabase
            .from('community_poll_options')
            .select('*')
            .in('poll_id', pollIds)
            .order('position', { ascending: true })
        : Promise.resolve({ data: [] as any[] }),
      ctx.identityId && postIds.length > 0
        ? supabase
            .from('community_reactions')
            .select('target_id, reaction_type')
            .eq('target_type', 'post')
            .eq('identity_id', ctx.identityId)
            .in('target_id', postIds)
        : Promise.resolve({ data: [] as any[] }),
      ctx.identityId && pollIds.length > 0
        ? supabase
            .from('community_poll_votes')
            .select('poll_id, option_id')
            .eq('identity_id', ctx.identityId)
            .in('poll_id', pollIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    // -----------------------------------------------------------
    // Build maps
    // -----------------------------------------------------------
    const authorMap = new Map((authorsRes.data || []).map((u: any) => [u.id, u]))
    const attMap = new Map<string, any[]>()
    for (const a of (attachmentsRes.data || []) as any[]) {
      const arr = attMap.get(a.post_id) || []
      arr.push(a)
      attMap.set(a.post_id, arr)
    }
    const pollMap = new Map((pollsRes.data || []).map((p: any) => [p.id, p]))
    const optMap = new Map<string, any[]>()
    for (const o of (optionsRes.data || []) as any[]) {
      const arr = optMap.get(o.poll_id) || []
      arr.push(o)
      optMap.set(o.poll_id, arr)
    }
    const userVoteMap = new Map<string, string[]>()
    for (const v of (userVotesRes.data || []) as any[]) {
      const arr = userVoteMap.get(v.poll_id) || []
      arr.push(v.option_id)
      userVoteMap.set(v.poll_id, arr)
    }
    const reactionMap = new Map((userReactionsRes.data || []).map((r: any) => [r.target_id, r.reaction_type]))

    const enrichPost = (p: any) => ({
      ...p,
      author: authorMap.get(p.author_identity_id) ?? null,
      attachments: attMap.get(p.id) || [],
      poll: p.poll_id
        ? {
            ...(pollMap.get(p.poll_id) || {}),
            options: optMap.get(p.poll_id) || [],
            my_votes: userVoteMap.get(p.poll_id) || [],
          }
        : null,
      my_reaction: reactionMap.get(p.id) || null,
    })

    return ok(
      {
        items: items.map(enrichPost),
        pinned: pinned.map(enrichPost),
        announcements: announcements.map((a: any) => ({
          ...a,
          author: authorMap.get(a.author_identity_id) ?? null,
        })),
        next_cursor: nextCursor,
        has_more: hasMore,
      },
      { ctx }
    )
  } catch (err) {
    return fail(err, ctx)
  }
}