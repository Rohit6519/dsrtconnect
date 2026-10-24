import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)

  const type = searchParams.get('type')
  const skills = searchParams.get('skills')?.split(',').filter(Boolean) || []
  const industry = searchParams.get('industry')
  const commitment = searchParams.get('commitment')
  const workMode = searchParams.get('work_mode')
  const experience = searchParams.get('experience')
  const location = searchParams.get('location')
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  const sort = searchParams.get('sort') || 'recent'

  // ==================================================
  // BEST MATCH — use algorithm cache
  // ==================================================
  if (sort === 'best_match' && user) {
    let cacheQ = supabase.from('team_up_recommendations_cache')
      .select('source_type, source_id, total_score, match_reasons, request_type')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())

    if (type && type !== 'all') {
      if (type === 'jobs') cacheQ = cacheQ.in('request_type', ['jobs', 'hiring'])
      else cacheQ = cacheQ.eq('request_type', type)
    }

    let { data: cached } = await cacheQ.order('total_score', { ascending: false }).limit(200)

    // Trigger recompute if empty
    if (!cached || cached.length === 0) {
      await supabase.rpc('fn_refresh_team_up_recommendations', {
        p_user_id: user.id,
        p_limit: 100,
      }).catch(() => null)

      let refetch = supabase.from('team_up_recommendations_cache')
        .select('source_type, source_id, total_score, match_reasons, request_type')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
      if (type && type !== 'all') {
        if (type === 'jobs') refetch = refetch.in('request_type', ['jobs', 'hiring'])
        else refetch = refetch.eq('request_type', type)
      }
      const { data } = await refetch.order('total_score', { ascending: false }).limit(200)
      cached = data || []
    }

    if (!cached || cached.length === 0) {
      // Fallback to recent
      return listByFilters(supabase, {
        type, skills, industry, commitment, workMode, experience, location, status, q, limit, offset,
        sort: 'recent',
      })
    }

    // Hydrate opportunities
    const paginated = cached.slice(offset, offset + limit)
    const teamUpIds = paginated.filter(s => s.source_type === 'team_up').map(s => s.source_id)
    const ventureLfIds = paginated.filter(s => s.source_type === 'venture_lf').map(s => s.source_id)
    const projectRoleIds = paginated.filter(s => s.source_type === 'project_role').map(s => s.source_id)

    const hydrateFilters: string[] = []
    if (teamUpIds.length) hydrateFilters.push(`and(source_type.eq.team_up,source_id.in.(${teamUpIds.join(',')}))`)
    if (ventureLfIds.length) hydrateFilters.push(`and(source_type.eq.venture_lf,source_id.in.(${ventureLfIds.join(',')}))`)
    if (projectRoleIds.length) hydrateFilters.push(`and(source_type.eq.project_role,source_id.in.(${projectRoleIds.join(',')}))`)

    let opps: any[] = []
    if (hydrateFilters.length > 0) {
      const { data } = await supabase.from('team_up_unified').select('*').or(hydrateFilters.join(','))
      opps = data || []
    }

    const oppMap = new Map(opps.map((o: any) => [`${o.source_type}:${o.source_id}`, o]))
    const scoreMap = new Map(paginated.map((s: any) => [`${s.source_type}:${s.source_id}`, s]))

    let items = paginated
      .map(s => oppMap.get(`${s.source_type}:${s.source_id}`))
      .filter(Boolean)
      .map((o: any) => ({
        ...o,
        match_score: scoreMap.get(`${o.source_type}:${o.source_id}`)?.total_score || 0,
        match_reasons: scoreMap.get(`${o.source_type}:${o.source_id}`)?.match_reasons || [],
      }))

    return enrichAndReturn(supabase, items, cached.length)
  }

  // ==================================================
  // OTHER SORTS — direct query on unified view
  // ==================================================
  return listByFilters(supabase, {
    type, skills, industry, commitment, workMode, experience, location, status, q, limit, offset, sort,
  })
}

async function listByFilters(supabase: any, opts: any) {
  const { type, skills, industry, commitment, workMode, experience, location, status, q, limit, offset, sort } = opts

  let query = supabase.from('team_up_unified').select('*', { count: 'exact' })

  if (type && type !== 'all') {
    if (type === 'jobs') {
      query = query.in('request_type', ['jobs', 'hiring'])
    } else {
      query = query.eq('request_type', type)
    }
  }
  if (industry) query = query.eq('industry', industry)
  if (commitment) query = query.eq('commitment', commitment)
  if (workMode) query = query.eq('work_mode', workMode)
  if (experience) query = query.eq('experience_level', experience)
  if (location) query = query.ilike('location', `%${location}%`)
  if (status) query = query.eq('status', status)
  if (skills.length > 0) query = query.overlaps('required_skills', skills)
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,tagline.ilike.%${q}%`)
  }

  if (sort === 'recent') query = query.order('published_at', { ascending: false, nullsFirst: false })
  else if (sort === 'popular') query = query.order('view_count', { ascending: false })
  else if (sort === 'deadline') query = query.order('application_deadline', { ascending: true, nullsFirst: false })
  else if (sort === 'activity') query = query.order('last_activity_at', { ascending: false })

  const { data, count } = await query.range(offset, offset + limit - 1)
  return enrichAndReturn(supabase, data || [], count || 0)
}

async function enrichAndReturn(supabase: any, items: any[], total: number) {
  const ownerIds = [...new Set(items.map((d: any) => d.owner_id).filter(Boolean))]
  const ventureIds = [...new Set(items.map((d: any) => d.venture_id).filter(Boolean))]
  const projectIds = [...new Set(items.map((d: any) => d.project_id).filter(Boolean))]

  const [ownersRes, venturesRes, projectsRes] = await Promise.all([
    ownerIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', ownerIds) : { data: [] },
    ventureIds.length ? supabase.from('ventures').select('id, slug, name, logo_url, tagline').in('id', ventureIds) : { data: [] },
    projectIds.length ? supabase.from('projects').select('id, slug, name, logo_url, tagline, icon').in('id', projectIds) : { data: [] },
  ])

  const ownerMap = new Map((ownersRes.data || []).map((u: any) => [u.id, u]))
  const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))
  const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))

  const enriched = items.map((item: any) => ({
    ...item,
    owner: ownerMap.get(item.owner_id) || null,
    venture: item.venture_id ? ventureMap.get(item.venture_id) || null : null,
    project: item.project_id ? projectMap.get(item.project_id) || null : null,
  }))

  return NextResponse.json({ items: enriched, total, limit: enriched.length, offset: 0 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const {
    context_type = 'personal',
    project_id, venture_id, organization_id,
    request_type = 'collaborate',
    title, tagline, subline, description, what_youll_do,
    responsibilities = [], required_skills = [], nice_to_have_skills = [],
    commitment, work_mode = 'remote', location, hours_per_week, duration,
    start_date, application_deadline, positions_open = 1,
    compensation_type = 'unpaid', compensation_min, compensation_max,
    compensation_currency = 'USD', compensation_period,
    equity_min, equity_max, compensation_hidden = false,
    require_resume = false, require_portfolio = false, require_github = false,
    require_website = false, require_cover_letter = true,
    custom_questions = [], experience_level, industry, sector, category,
    role_category, employment_type,
    urgency = 'normal', status = 'draft',
    content_blocks, content_html, content_text, cover_image_url,
  } = body

  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  if (context_type === 'project' && !project_id)
    return NextResponse.json({ error: 'project_id required for project context' }, { status: 400 })
  if (context_type === 'venture' && !venture_id)
    return NextResponse.json({ error: 'venture_id required for venture context' }, { status: 400 })
  if (context_type === 'organization' && !organization_id)
    return NextResponse.json({ error: 'organization_id required for organization context' }, { status: 400 })

  if (context_type === 'project' && project_id) {
    const { data: proj } = await supabase.from('projects')
      .select('founder_id, user_id').eq('id', project_id).single()
    if (!proj || (proj.founder_id !== user.id && proj.user_id !== user.id))
      return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 })
  }
  if (context_type === 'venture' && venture_id) {
    const { data: vent } = await supabase.from('ventures')
      .select('user_id, founder_id').eq('id', venture_id).single()
    if (!vent || (vent.user_id !== user.id && vent.founder_id !== user.id))
      return NextResponse.json({ error: 'Not authorized for this venture' }, { status: 403 })
  }

  const { data, error } = await supabase.from('team_up_requests').insert({
    user_id: user.id,
    context_type, project_id, venture_id, organization_id,
    request_type, title, tagline, subline, description, what_youll_do,
    responsibilities, required_skills, nice_to_have_skills,
    commitment, work_mode, location, hours_per_week, duration,
    start_date, application_deadline, positions_open,
    compensation_type, compensation_min, compensation_max,
    compensation_currency, compensation_period,
    equity_min, equity_max, compensation_hidden,
    require_resume, require_portfolio, require_github,
    require_website, require_cover_letter,
    custom_questions, experience_level, industry, sector, category,
    role_category, employment_type,
    urgency, status,
    content_blocks, content_html, content_text, cover_image_url,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data }, { status: 201 })
}
