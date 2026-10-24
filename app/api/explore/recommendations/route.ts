import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/explore/recommendations
 *   Legacy endpoint used by ExploreView.tsx for Projects.
 *   Now proxies to the cache-based /api/projects/explore engine.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const industry = searchParams.get('industry') || 'all'
  const sort = searchParams.get('sort') || 'recommended'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  const sessionId = searchParams.get('session_id') || null

  try {
    // ═══ AUTHENTICATED + RECOMMENDED = CACHE PATH ═══
    if (user && sort === 'recommended') {
      const { data: cachedRows } = await supabase
        .from('project_recommendations_cache')
        .select('project_id, total_score, match_reasons, bucket, matched_categories')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('total_score', { ascending: false })
        .limit(200)

      let cached = cachedRows || []

      // Refresh if stale
      if (cached.length === 0) {
        await supabase.rpc('fn_refresh_project_recommendations', {
          p_user_id: user.id,
          p_limit: 100,
        }).then(() => {}, () => {})

        const { data: refetched } = await supabase
          .from('project_recommendations_cache')
          .select('project_id, total_score, match_reasons, bucket, matched_categories')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .order('total_score', { ascending: false })
          .limit(200)

        cached = refetched || []
      }

      if (cached.length > 0) {
        // Filter by industry
        if (industry && industry !== 'all') {
          const indLower = industry.toLowerCase()
          cached = cached.filter(c =>
            (c.matched_categories || []).some((mc: string) => mc.toLowerCase() === indLower)
          )
        }

        // Filter session views
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

        const paginated = cached.slice(offset, offset + limit)

        if (paginated.length > 0) {
          const projectIds = paginated.map(c => c.project_id)
          const { data: projects } = await supabase
            .from('projects')
            .select(`
              id, slug, name, tagline, description, icon, color,
              stage, cover_image_url, project_number,
              category, tech_stack, sector,
              team_size, open_roles, follower_count, view_count, save_count,
              traction_score, global_rank,
              is_dsrt_verified, is_open_source, founder_verified,
              founder_id, user_id
            `)
            .in('id', projectIds)

          const projectMap = new Map((projects || []).map((p: any) => [p.id, p]))
          const scoreMap = new Map(paginated.map(c => [c.project_id, c]))

          const results = paginated
            .map(c => {
              const p = projectMap.get(c.project_id) as any
              if (!p) return null
              return {
                ...p,
                _score: c.total_score,
                _matchReasons: c.match_reasons || [],
                _bucket: c.bucket,
                personal_score: c.total_score,
              }
            })
            .filter(Boolean)

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
            results: enriched,
            pagination: {
              limit, offset,
              count: enriched.length,
              hasMore: cached.length > offset + limit,
              nextOffset: offset + enriched.length,
            },
            source: 'cache',
          })
        }
      }
    }

    // ═══ FALLBACK: use existing RPC ═══
    const validSorts = ['recommended', 'newest', 'oldest', 'most_viewed', 'trending']
    const safeSort = validSorts.includes(sort) ? sort : 'recommended'

    const { data, error } = await supabase.rpc('dsrt_recommend_projects', {
      p_user_id: user?.id || null,
      p_industry: industry === 'all' ? null : industry,
      p_sort: safeSort,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error

    const results = data || []

    return NextResponse.json({
      results,
      pagination: {
        limit, offset,
        count: results.length,
        hasMore: results.length >= limit,
        nextOffset: offset + results.length,
      },
      source: 'rpc-fallback',
    })
  } catch (error: any) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { error: error?.message, results: [] },
      { status: 500 }
    )
  }
}