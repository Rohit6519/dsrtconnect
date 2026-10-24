import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/recommendations
//   ?limit=24
//   &request_type=jobs|hiring|cofounder|...  (optional filter)
//   &diversify=true  (default true — mix request types)
//
// Returns: top-N recommendations for current user, ordered by algorithm score.
// Uses cache first, refreshes if stale.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)
  const requestType = searchParams.get('request_type')
  const diversify = searchParams.get('diversify') !== 'false'

  // 1. Check cache
  let cacheQuery = supabase.from('team_up_recommendations_cache')
    .select('*')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())

  if (requestType) cacheQuery = cacheQuery.eq('request_type', requestType)

  let { data: cached } = await cacheQuery
    .order('total_score', { ascending: false })
    .limit(limit * 3) // fetch more so we can diversify

  // 2. If cache empty / stale, refresh
  if (!cached || cached.length === 0) {
    await supabase.rpc('fn_refresh_team_up_recommendations', {
      p_user_id: user.id,
      p_limit: 100,
    }).catch(() => null)

    let refetch = supabase.from('team_up_recommendations_cache')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
    if (requestType) refetch = refetch.eq('request_type', requestType)

    const { data } = await refetch.order('total_score', { ascending: false }).limit(limit * 3)
    cached = data || []
  }

  if (cached.length === 0) {
    return NextResponse.json({ items: [], total: 0, from_cache: false })
  }

  // 3. Diversify by request type (avoid 20 in a row of same type)
  let selected = cached
  if (diversify && !requestType) {
    selected = diversifyByType(cached, limit)
  } else {
    selected = cached.slice(0, limit)
  }

  // 4. Hydrate with full opportunity data from unified view
  const teamUpIds = selected.filter(s => s.source_type === 'team_up').map(s => s.source_id)
  const ventureLfIds = selected.filter(s => s.source_type === 'venture_lf').map(s => s.source_id)
  const projectRoleIds = selected.filter(s => s.source_type === 'project_role').map(s => s.source_id)

  const hydrateFilters: string[] = []
  if (teamUpIds.length) hydrateFilters.push(`and(source_type.eq.team_up,source_id.in.(${teamUpIds.join(',')}))`)
  if (ventureLfIds.length) hydrateFilters.push(`and(source_type.eq.venture_lf,source_id.in.(${ventureLfIds.join(',')}))`)
  if (projectRoleIds.length) hydrateFilters.push(`and(source_type.eq.project_role,source_id.in.(${projectRoleIds.join(',')}))`)

  let opportunities: any[] = []
  if (hydrateFilters.length > 0) {
    const { data } = await supabase.from('team_up_unified')
      .select('*')
      .or(hydrateFilters.join(','))
    opportunities = data || []
  }

  // Enrich with owner, venture, project
  const ownerIds = [...new Set(opportunities.map((o: any) => o.owner_id).filter(Boolean))]
  const ventureIds = [...new Set(opportunities.map((o: any) => o.venture_id).filter(Boolean))]
  const projectIds = [...new Set(opportunities.map((o: any) => o.project_id).filter(Boolean))]

  const [ownersRes, venturesRes, projectsRes] = await Promise.all([
    ownerIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', ownerIds) : { data: [] as any[] },
    ventureIds.length ? supabase.from('ventures').select('id, slug, name, logo_url, tagline').in('id', ventureIds) : { data: [] as any[] },
    projectIds.length ? supabase.from('projects').select('id, slug, name, logo_url, tagline, icon').in('id', projectIds) : { data: [] as any[] },
  ])

  const ownerMap = new Map((ownersRes.data || []).map((u: any) => [u.id, u]))
  const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))
  const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
  const opportunityMap = new Map(opportunities.map((o: any) => [`${o.source_type}:${o.source_id}`, o]))

  // Reorder to match the score-sorted `selected` array
  const items = selected
    .map(s => {
      const opp = opportunityMap.get(`${s.source_type}:${s.source_id}`)
      if (!opp) return null
      return {
        ...opp,
        owner: ownerMap.get(opp.owner_id) || null,
        venture: opp.venture_id ? ventureMap.get(opp.venture_id) || null : null,
        project: opp.project_id ? projectMap.get(opp.project_id) || null : null,
        match_score: s.total_score,
        match_reasons: s.match_reasons || [],
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    items,
    total: items.length,
    from_cache: true,
  })
}

// Round-robin by request_type — ensures diversity in the feed
function diversifyByType(items: any[], limit: number): any[] {
  const byType = new Map<string, any[]>()
  for (const item of items) {
    const t = item.request_type || 'other'
    if (!byType.has(t)) byType.set(t, [])
    byType.get(t)!.push(item)
  }

  const result: any[] = []
  const types = Array.from(byType.keys())
  let cursor = 0

  while (result.length < limit && types.some(t => (byType.get(t)?.length || 0) > 0)) {
    const t = types[cursor % types.length]
    const bucket = byType.get(t)
    if (bucket && bucket.length > 0) {
      result.push(bucket.shift())
    }
    cursor++
    if (cursor > types.length * limit) break // safety
  }

  return result
}
