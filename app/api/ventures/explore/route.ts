import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ventures/explore
 *   ?sort=recommended|newest|most_viewed|trending
 *   ?domain=<name>
 *   ?type=<venture_type>
 *   ?limit=24 &offset=0
 *   ?session_id=<sid>
 *
 * Cache-first pattern for recommended sort.
 * Direct query for other sorts.
 * Verified assessments rank higher in default/recommended sort.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') || 'recommended'
  const domain = searchParams.get('domain') || null
  const ventureType = searchParams.get('type') || null
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const sessionId = searchParams.get('session_id') || null

  try {
    // ═══ ANONYMOUS OR NON-RECOMMENDED SORTS ═══
    if (!user || sort !== 'recommended') {
      return await fetchVenturesDirectly(supabase, {
        sort, domain, ventureType, limit, offset, userId: user?.id,
      })
    }

    // ═══ AUTHENTICATED + RECOMMENDED = USE CACHE ═══
    const { data: cachedRows } = await supabase
      .from('venture_recommendations_cache')
      .select(`
        venture_id, total_score, match_reasons, bucket,
        matched_categories, matched_community_ids, matched_venture_type
      `)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('total_score', { ascending: false })
      .limit(200)

    let cached = cachedRows || []

    // Refresh if empty
    if (cached.length === 0) {
      await supabase.rpc('fn_refresh_venture_recommendations', {
        p_user_id: user.id,
        p_limit: 100,
      }).then(() => {}, (e) => console.error('Venture cache refresh failed:', e))

      const { data: refetched } = await supabase
        .from('venture_recommendations_cache')
        .select(`
          venture_id, total_score, match_reasons, bucket,
          matched_categories, matched_community_ids, matched_venture_type
        `)
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('total_score', { ascending: false })
        .limit(200)

      cached = refetched || []
    }

    // Still nothing → fallback
    if (cached.length === 0) {
      return await fetchVenturesDirectly(supabase, {
        sort: 'newest', domain, ventureType, limit, offset, userId: user.id,
      })
    }

    // Filter by domain
    if (domain && domain !== 'all') {
      const domLower = domain.toLowerCase()
      cached = cached.filter(c =>
        (c.matched_categories || []).some((mc: string) => mc.toLowerCase() === domLower)
      )
    }

    // Filter by venture_type
    if (ventureType && ventureType !== 'all') {
      cached = cached.filter(c =>
        c.matched_venture_type === ventureType
      )
    }

    // Filter out session-viewed
    if (sessionId) {
      const { data: sessionViews } = await supabase
        .from('user_session_views')
        .select('entity_id')
        .eq('session_id', sessionId)
        .eq('entity_type', 'venture')
        .gt('viewed_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())

      const viewedIds = new Set((sessionViews || []).map((v: any) => v.entity_id))
      cached = cached.filter(c => !viewedIds.has(c.venture_id))
    }

    // Diversify
    const diversified = diversifyByCategory(cached, 2)

    // Paginate
    const paginated = diversified.slice(offset, offset + limit)

    if (paginated.length === 0) {
      return NextResponse.json({
        ventures: [], hasMore: false, offset, limit,
        source: 'cache-empty-after-filters',
      })
    }

    // Hydrate ventures (includes has_verified_assessment + intelligence_score)
    const ventureIds = paginated.map(c => c.venture_id)
    const { data: ventures, error } = await supabase
      .from('ventures')
      .select(`
        id, slug, name, tagline, description, logo_url, cover_url,
        stage, status, industry, sector, sub_category, venture_type, venture_number,
        follower_count, view_count, is_verified, is_hiring,
        seeking_investment, seeking_cofounder, seeking_advisor, seeking_partner,
        last_activity_at, updated_at, created_at,
        team_size, tags, founder_id, user_id,
        traction_score, global_rank, industry_rank,
        has_verified_assessment, intelligence_score
      `)
      .in('id', ventureIds)

    if (error) throw error

    // Merge with cache metadata + counts
    const ventureMap = new Map((ventures || []).map((v: any) => [v.id, v]))
    const scoreMap = new Map(paginated.map(c => [c.venture_id, c]))

    // Get team_count + open_roles_count
    const [teamCounts, roleCounts] = await Promise.all([
      supabase
        .from('venture_team_members')
        .select('venture_id')
        .in('venture_id', ventureIds)
        .then((r: any) => r.data || [], () => []),
      supabase
        .from('venture_looking_for')
        .select('venture_id')
        .in('venture_id', ventureIds)
        .in('status', ['active', 'open'])
        .then((r: any) => r.data || [], () => []),
    ])

    const teamMap = new Map<string, number>()
    ;(teamCounts as any[]).forEach((t: any) => {
      teamMap.set(t.venture_id, (teamMap.get(t.venture_id) || 0) + 1)
    })

    const roleMap = new Map<string, number>()
    ;(roleCounts as any[]).forEach((r: any) => {
      roleMap.set(r.venture_id, (roleMap.get(r.venture_id) || 0) + 1)
    })

    const results = paginated
      .map(c => {
        const v = ventureMap.get(c.venture_id) as any
        if (!v) return null
        const score = scoreMap.get(c.venture_id) as any
        return {
          ...v,
          team_count: teamMap.get(v.id) || 0,
          open_roles_count: roleMap.get(v.id) || 0,
          _score: score?.total_score,
          _matchReasons: score?.match_reasons || [],
          _bucket: score?.bucket,
          _matchedCategories: score?.matched_categories || [],
        }
      })
      .filter(Boolean)

    // Boost verified assessments to the top of recommended results
    results.sort((a: any, b: any) => {
      const aV = a.has_verified_assessment ? 1 : 0
      const bV = b.has_verified_assessment ? 1 : 0
      if (bV !== aV) return bV - aV
      const aS = a.intelligence_score || 0
      const bS = b.intelligence_score || 0
      if (bS !== aS) return bS - aS
      return (b._score || 0) - (a._score || 0)
    })

    return NextResponse.json({
      ventures: results,
      hasMore: diversified.length > offset + limit,
      offset,
      limit,
      totalScored: cached.length,
      source: 'cache',
    })
  } catch (e: any) {
    console.error('Ventures explore error:', e)
    return NextResponse.json(
      { ventures: [], hasMore: false, error: e?.message },
      { status: 500 }
    )
  }
}

async function fetchVenturesDirectly(supabase: any, opts: {
  sort: string; domain: string | null; ventureType: string | null;
  limit: number; offset: number; userId?: string
}) {
  const { sort, domain, ventureType, limit, offset, userId } = opts

  let query = supabase
    .from('ventures')
    .select(`
      id, slug, name, tagline, description, logo_url, cover_url,
      stage, status, industry, sector, sub_category, venture_type, venture_number,
      follower_count, view_count, is_verified, is_hiring,
      seeking_investment, seeking_cofounder, seeking_advisor, seeking_partner,
      last_activity_at, updated_at, created_at,
      team_size, tags, founder_id, user_id,
      traction_score, global_rank, industry_rank,
      has_verified_assessment, intelligence_score
    `)
    .eq('show_in_explore', true)
    .neq('status', 'archived')

  if (userId) {
    query = query.or(`founder_id.neq.${userId},founder_id.is.null`)
  }

  if (domain && domain !== 'all') {
    query = query.or(`industry.ilike.%${domain}%,sector.ilike.%${domain}%`)
  }

  if (ventureType && ventureType !== 'all') {
    query = query.eq('venture_type', ventureType)
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'most_viewed') {
    query = query.order('view_count', { ascending: false, nullsFirst: false })
  } else if (sort === 'trending') {
    query = query.order('traction_score', { ascending: false, nullsFirst: false })
  } else {
    // Default / recommended: verified assessments first, then intelligence score, then activity
    query = query
      .order('has_verified_assessment', { ascending: false, nullsFirst: false })
      .order('intelligence_score', { ascending: false, nullsFirst: false })
      .order('last_activity_at', { ascending: false, nullsFirst: false })
  }

  const { data: ventures, error } = await query.range(offset, offset + limit - 1)
  if (error) throw error

  const ventureIds = (ventures || []).map((v: any) => v.id)

  const [teamCounts, roleCounts] = await Promise.all([
    supabase
      .from('venture_team_members')
      .select('venture_id')
      .in('venture_id', ventureIds)
      .then((r: any) => r.data || [], () => []),
    supabase
      .from('venture_looking_for')
      .select('venture_id')
      .in('venture_id', ventureIds)
      .in('status', ['active', 'open'])
      .then((r: any) => r.data || [], () => []),
  ])

  const teamMap = new Map<string, number>()
  ;(teamCounts as any[]).forEach((t: any) => {
    teamMap.set(t.venture_id, (teamMap.get(t.venture_id) || 0) + 1)
  })

  const roleMap = new Map<string, number>()
  ;(roleCounts as any[]).forEach((r: any) => {
    roleMap.set(r.venture_id, (roleMap.get(r.venture_id) || 0) + 1)
  })

  const enriched = (ventures || []).map((v: any) => ({
    ...v,
    team_count: teamMap.get(v.id) || 0,
    open_roles_count: roleMap.get(v.id) || 0,
  }))

  return NextResponse.json({
    ventures: enriched,
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