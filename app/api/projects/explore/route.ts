import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') || 'recommended'
  const category = searchParams.get('category') || null
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const sessionId = searchParams.get('session_id') || null

  try {
    // Anonymous or non-recommended sorts → direct query
    if (!user || sort !== 'recommended') {
      return await fetchProjectsDirectly(supabase, {
        sort, category, limit, offset, userId: user?.id,
      })
    }

    // Authenticated + recommended → use cache
    const { data: cachedRows } = await supabase
      .from('project_recommendations_cache')
      .select('project_id, total_score, match_reasons, bucket, matched_categories, matched_community_ids')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('total_score', { ascending: false })
      .limit(200)

    let cached = cachedRows || []

    // Refresh cache if empty
    if (cached.length === 0) {
      const { error: rpcErr } = await supabase.rpc('fn_refresh_project_recommendations', {
        p_user_id: user.id,
        p_limit: 100,
      })
      if (rpcErr) console.error('Cache refresh RPC error:', rpcErr)

      const { data: refetched } = await supabase
        .from('project_recommendations_cache')
        .select('project_id, total_score, match_reasons, bucket, matched_categories, matched_community_ids')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('total_score', { ascending: false })
        .limit(200)

      cached = refetched || []
    }

    // Still nothing → fall back to direct query
    if (cached.length === 0) {
      return await fetchProjectsDirectly(supabase, {
        sort: 'newest', category, limit, offset, userId: user.id,
      })
    }

    // Category filter
    if (category && category !== 'all') {
      const catLower = category.toLowerCase()
      cached = cached.filter(c =>
        (c.matched_categories || []).some((mc: string) => mc.toLowerCase() === catLower)
      )
    }

    // Session no-repeat filter
    if (sessionId) {
      const { data: sessionViews } = await supabase
        .from('user_session_views')
        .select('entity_id')
        .eq('session_id', sessionId)
        .eq('entity_type', 'project')
        .gt('viewed_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())

      const viewedIds = new Set((sessionViews || []).map((v: any) => v.entity_id))
      cached = cached.filter(c => !viewedIds.has(c.project_id))
    }

    const diversified = diversifyByCategory(cached, 2)
    const paginated = diversified.slice(offset, offset + limit)

    if (paginated.length === 0) {
      return NextResponse.json({
        projects: [], results: [], hasMore: false, offset, limit,
        source: 'cache-empty-after-filters',
      })
    }

    // Hydrate
    const projectIds = paginated.map(c => c.project_id)
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select(`
        id, slug, name, tagline, description, icon, color,
        stage, cover_image_url, project_number,
        category, tech_stack, sector,
        team_size, open_roles, follower_count, view_count, save_count,
        traction_score, global_rank,
        is_dsrt_verified, is_open_source, founder_verified,
        founder_id, user_id, published_at, created_at, last_activity_at
      `)
      .in('id', projectIds)

    if (projErr) throw projErr

    const projectMap = new Map((projects || []).map((p: any) => [p.id, p]))
    const scoreMap = new Map(paginated.map(c => [c.project_id, c]))

    const results = paginated
      .map(c => {
        const p = projectMap.get(c.project_id)
        if (!p) return null
        return {
          ...p,
          _score: c.total_score,
          _matchReasons: c.match_reasons || [],
          _bucket: c.bucket,
          _matchedCategories: c.matched_categories || [],
        }
      })
      .filter(Boolean)

    const founderIds = [...new Set(results.map((r: any) => r.founder_id || r.user_id).filter(Boolean))]
    let founderMap = new Map()
    if (founderIds.length > 0) {
      const { data: founders } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, is_verified')
        .in('id', founderIds)
      founderMap = new Map((founders || []).map((f: any) => [f.id, f]))
    }

    const enriched = results.map((r: any) => {
      const founder = founderMap.get(r.founder_id || r.user_id)
      return {
        ...r,
        founder_name: founder?.full_name || null,
        founder_username: founder?.username || null,
        founder_avatar: founder?.avatar_url || null,
        founder_user_verified: founder?.is_verified || false,
      }
    })

    return NextResponse.json({
      projects: enriched,
      results: enriched,
      hasMore: diversified.length > offset + limit,
      offset,
      limit,
      totalScored: cached.length,
      source: 'cache',
    })
  } catch (e: any) {
    console.error('Projects explore error:', e)
    return NextResponse.json(
      { projects: [], results: [], hasMore: false, error: e?.message },
      { status: 500 }
    )
  }
}

/**
 * FIXED: Now matches dsrt_recommend_projects filter logic
 * - Requires is_public=true OR visibility='public'
 * - Excludes drafts and archived
 * - Excludes projects owned by user
 */
async function fetchProjectsDirectly(supabase: any, opts: {
  sort: string; category: string | null; limit: number; offset: number; userId?: string
}) {
  const { sort, category, limit, offset, userId } = opts

  let query = supabase
    .from('projects')
    .select(`
      id, slug, name, tagline, description, icon, color,
      stage, cover_image_url, project_number,
      category, tech_stack, sector,
      team_size, open_roles, follower_count, view_count, save_count,
      traction_score, global_rank,
      is_dsrt_verified, is_open_source, founder_verified,
      founder_id, user_id, published_at, created_at, last_activity_at,
      is_public, visibility, status
    `)
    // FIXED: Match RPC filter — public projects only
    .or('is_public.eq.true,visibility.eq.public')
    .not('status', 'in', '("draft","archived")')

  // Exclude user's own projects
  if (userId) {
    query = query
      .or(`founder_id.neq.${userId},founder_id.is.null`)
      .or(`user_id.neq.${userId},user_id.is.null`)
  }

  if (category && category !== 'all') {
    query = query.or(`sector.ilike.%${category}%,category.cs.{${category}}`)
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'most_viewed') {
    query = query.order('view_count', { ascending: false, nullsFirst: false })
  } else if (sort === 'trending') {
    query = query.order('traction_score', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('last_activity_at', { ascending: false, nullsFirst: false })
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('Direct project query error:', error)
    // Ultimate fallback: try the RPC that we know works
    const { data: rpcData } = await supabase.rpc('dsrt_recommend_projects', {
      p_user_id: userId || null,
      p_industry: category === 'all' ? null : category,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    })
    const rpcResults = rpcData || []
    return NextResponse.json({
      projects: rpcResults,
      results: rpcResults,
      hasMore: rpcResults.length >= limit,
      offset,
      limit,
      source: 'rpc-fallback',
    })
  }

  const results = data || []

  // Attach founders
  const founderIds = [...new Set(results.map((r: any) => r.founder_id || r.user_id).filter(Boolean))]
  let founderMap = new Map()
  if (founderIds.length > 0) {
    const { data: founders } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, is_verified')
      .in('id', founderIds)
    founderMap = new Map((founders || []).map((f: any) => [f.id, f]))
  }

  const enriched = results.map((r: any) => {
    const founder = founderMap.get(r.founder_id || r.user_id)
    return {
      ...r,
      founder_name: founder?.full_name || null,
      founder_username: founder?.username || null,
      founder_avatar: founder?.avatar_url || null,
      founder_user_verified: founder?.is_verified || false,
    }
  })

  return NextResponse.json({
    projects: enriched,
    results: enriched,
    hasMore: enriched.length >= limit,
    offset,
    limit,
    source: 'direct',
  })
}

function diversifyByCategory(items: any[], maxConsecutive: number): any[] {
  if (items.length <= maxConsecutive + 1) return items

  const result: any[] = []
  const bench: any[] = []
  let lastCat = ''
  let runLength = 0

  for (const item of items) {
    const cats = item.matched_categories || []
    const primaryCat = (cats[0] || 'other').toLowerCase()

    if (primaryCat === lastCat && runLength >= maxConsecutive) {
      bench.push(item)
      continue
    }
    result.push(item)
    if (primaryCat === lastCat) {
      runLength++
    } else {
      lastCat = primaryCat
      runLength = 1
    }
  }

  if (bench.length > 0 && result.length > 0) {
    const spacing = Math.max(2, Math.floor(result.length / bench.length))
    for (let i = 0; i < bench.length; i++) {
      const pos = Math.min(result.length, (i + 1) * spacing + i)
      result.splice(pos, 0, bench[i])
    }
  }

  return result
}