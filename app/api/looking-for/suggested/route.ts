import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/suggested
// ?type=opportunities   -> opportunities recommended for the current user
// ?type=people          -> people recommended (either globally or for_request_id)
// ?for_request_id=xxx&source=team_up  -> suggest people for a specific request
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'opportunities'
  const forRequestId = searchParams.get('for_request_id')
  const source = searchParams.get('source') || 'team_up'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)

  // Load current user's profile once (used for both modes)
  const { data: userProfile } = await supabase.from('users')
    .select('id, interest_topics, brings, seeking, focus_sectors, location, availability, is_open_to_work, looking_for_opportunities')
    .eq('id', user.id).single()

  const { data: userSkillRows } = await supabase.from('user_skills')
    .select('skills(name)').eq('user_id', user.id)
  const userSkillNames: string[] = (userSkillRows || [])
    .map((s: any) => s.skills?.name).filter(Boolean)

  // ============================================================
  // MODE 1: Suggest PEOPLE for a specific request
  // ============================================================
  if (type === 'people' && forRequestId) {
    const { data: req } = await supabase.from('team_up_unified')
      .select('required_skills, nice_to_have_skills, industry, sector, experience_level, work_mode, location, commitment, owner_id')
      .eq('source_type', source).eq('source_id', forRequestId).maybeSingle()

    if (!req) return NextResponse.json({ suggestions: [], mode: 'people' })

    const requiredSkills: string[] = req.required_skills || []
    const niceSkills: string[] = req.nice_to_have_skills || []

    // Resolve skill IDs
    const allSkills = [...requiredSkills, ...niceSkills]
    const { data: skillRows } = allSkills.length ? await supabase
      .from('skills').select('id, name').in('name', allSkills) : { data: [] }
    const skillNameToId = new Map((skillRows || []).map(s => [s.name, s.id]))
    const requiredIds = requiredSkills.map(n => skillNameToId.get(n)).filter(Boolean) as string[]
    const niceIds = niceSkills.map(n => skillNameToId.get(n)).filter(Boolean) as string[]
    const allIds = [...requiredIds, ...niceIds]

    if (allIds.length === 0) {
      return NextResponse.json({ suggestions: [], mode: 'people' })
    }

    // Find users with those skills
    const { data: userSkills } = await supabase
      .from('user_skills').select('user_id, skill_id').in('skill_id', allIds)

    // Score: required=3pts, nice=1pt
    const userScores = new Map<string, { required: number; nice: number; total: number }>()
    ;(userSkills || []).forEach(us => {
      const cur = userScores.get(us.user_id) || { required: 0, nice: 0, total: 0 }
      if (requiredIds.includes(us.skill_id)) cur.required += 1
      else if (niceIds.includes(us.skill_id)) cur.nice += 1
      cur.total = cur.required * 3 + cur.nice
      userScores.set(us.user_id, cur)
    })

    // Exclude self and request owner
    userScores.delete(user.id)
    if (req.owner_id) userScores.delete(req.owner_id)

    // Exclude those already applied to this request
    const applyFilter: any = { applicant_id: null }
    if (source === 'team_up') applyFilter.request_id = forRequestId
    else if (source === 'venture_lf') applyFilter.venture_lf_id = forRequestId
    else if (source === 'project_role') applyFilter.project_role_id = forRequestId
    delete applyFilter.applicant_id

    const { data: existingApps } = await supabase
      .from('looking_for_applications').select('applicant_id').match(applyFilter)
    ;(existingApps || []).forEach(a => userScores.delete(a.applicant_id))

    // Exclude those already invited
    const { data: existingInvites } = await supabase
      .from('team_up_invitations').select('to_user_id')
      .eq('source_type', source).eq('source_id', forRequestId)
      .in('status', ['pending','accepted'])
    ;(existingInvites || []).forEach(i => userScores.delete(i.to_user_id))

    const topUserIds = Array.from(userScores.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit)
      .map(([uid]) => uid)

    if (topUserIds.length === 0) {
      return NextResponse.json({ suggestions: [], mode: 'people' })
    }

    const [usersRes, skillsRes] = await Promise.all([
      supabase.from('users')
        .select('id, username, full_name, avatar_url, tagline, bio, location, availability, is_verified, execution_score, brings, is_open_to_work, follower_count')
        .in('id', topUserIds),
      supabase.from('user_skills')
        .select('user_id, skills(name)').in('user_id', topUserIds),
    ])

    const userSkillMap = new Map<string, string[]>()
    ;(skillsRes.data || []).forEach((s: any) => {
      if (!s.skills?.name) return
      const arr = userSkillMap.get(s.user_id) || []
      arr.push(s.skills.name)
      userSkillMap.set(s.user_id, arr)
    })

    const enriched = (usersRes.data || []).map(u => {
      const score = userScores.get(u.id)!
      const skills = userSkillMap.get(u.id) || []
      const matchedSkills = skills.filter(s => requiredSkills.includes(s) || niceSkills.includes(s))
      const missingRequired = requiredSkills.filter(s => !skills.includes(s))

      return {
        ...u,
        skills,
        matched_skills: matchedSkills,
        missing_required: missingRequired,
        skill_match_count: score.required + score.nice,
        required_skills_total: requiredSkills.length,
      }
    }).sort((a, b) => {
      const sa = (userScores.get(a.id)?.total || 0)
      const sb = (userScores.get(b.id)?.total || 0)
      return sb - sa
    })

    return NextResponse.json({
      suggestions: enriched,
      mode: 'people',
      request: { id: forRequestId, source_type: source, required_skills: requiredSkills, nice_to_have_skills: niceSkills },
    })
  }

  // ============================================================
  // MODE 2: Suggest PEOPLE globally (for the current user's requests)
  // ============================================================
  if (type === 'people' && !forRequestId) {
    // Load current user's active requests
    const { data: myRequests } = await supabase
      .from('team_up_requests')
      .select('id, title, required_skills')
      .eq('user_id', user.id)
      .in('status', ['active','published','closing_soon'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (!myRequests || myRequests.length === 0) {
      return NextResponse.json({ suggestions: [], mode: 'people_global', no_active_requests: true })
    }

    const allRequiredSkills = Array.from(new Set(
      myRequests.flatMap(r => r.required_skills || [])
    ))

    if (allRequiredSkills.length === 0) {
      return NextResponse.json({ suggestions: [], mode: 'people_global' })
    }

    const { data: skillRows } = await supabase
      .from('skills').select('id, name').in('name', allRequiredSkills)
    const skillIds = (skillRows || []).map(s => s.id)

    const { data: userSkills } = skillIds.length ? await supabase
      .from('user_skills').select('user_id, skill_id').in('skill_id', skillIds) : { data: [] }

    const userScores = new Map<string, number>()
    ;(userSkills || []).forEach(us => {
      userScores.set(us.user_id, (userScores.get(us.user_id) || 0) + 1)
    })
    userScores.delete(user.id)

    const topUserIds = Array.from(userScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([uid]) => uid)

    if (topUserIds.length === 0) {
      return NextResponse.json({ suggestions: [], mode: 'people_global' })
    }

    const [usersRes, skillsRes] = await Promise.all([
      supabase.from('users')
        .select('id, username, full_name, avatar_url, tagline, bio, location, availability, is_verified, execution_score, brings, is_open_to_work, follower_count')
        .in('id', topUserIds),
      supabase.from('user_skills').select('user_id, skills(name)').in('user_id', topUserIds),
    ])

    const userSkillMap = new Map<string, string[]>()
    ;(skillsRes.data || []).forEach((s: any) => {
      if (!s.skills?.name) return
      const arr = userSkillMap.get(s.user_id) || []
      arr.push(s.skills.name)
      userSkillMap.set(s.user_id, arr)
    })

    const enriched = (usersRes.data || []).map(u => ({
      ...u,
      skills: userSkillMap.get(u.id) || [],
      skill_match_count: userScores.get(u.id) || 0,
    })).sort((a, b) => b.skill_match_count - a.skill_match_count)

    return NextResponse.json({
      suggestions: enriched,
      mode: 'people_global',
      user_requests: myRequests,
    })
  }

  // ============================================================
  // MODE 3 (default): Suggest OPPORTUNITIES for the current user
  // ============================================================
  const interests = userProfile?.interest_topics || []
  const sectors = userProfile?.focus_sectors || []
  const lookingFor = userProfile?.looking_for_opportunities || []

  // Get user's already-applied and saved to exclude
  const { data: appliedList } = await supabase.from('looking_for_applications')
    .select('request_id, venture_lf_id, project_role_id')
    .eq('applicant_id', user.id)

  const excluded = new Set<string>()
  ;(appliedList || []).forEach(a => {
    if (a.request_id) excluded.add(`team_up:${a.request_id}`)
    if (a.venture_lf_id) excluded.add(`venture_lf:${a.venture_lf_id}`)
    if (a.project_role_id) excluded.add(`project_role:${a.project_role_id}`)
  })

  // Get dismissed ones
  const { data: dismissed } = await supabase.from('team_up_saves')
    .select('source_type, source_id, collection').eq('user_id', user.id).eq('collection', 'dismissed')
  ;(dismissed || []).forEach(d => excluded.add(`${d.source_type}:${d.source_id}`))

  // Query unified view — start broad if user has skills, else return recent
  let query = supabase.from('team_up_unified').select('*').limit(limit * 3)

  if (userSkillNames.length > 0) {
    query = query.overlaps('required_skills', userSkillNames)
  } else if (interests.length > 0) {
    query = query.in('industry', interests)
  }

  const { data: rawOpps } = await query
  const opps = (rawOpps || []).filter(o => !excluded.has(`${o.source_type}:${o.source_id}`))
                              .filter(o => o.owner_id !== user.id)

  // Score
  const scored = opps.map(o => {
    let score = 0
    let reasons: string[] = []

    // Required skills overlap
    const oppSkills: string[] = o.required_skills || []
    const overlap = oppSkills.filter(s => userSkillNames.includes(s)).length
    if (overlap > 0) {
      score += overlap * 3
      reasons.push(overlap === oppSkills.length && oppSkills.length > 0
        ? `Matches all ${oppSkills.length} required skills`
        : `Matches ${overlap} of ${oppSkills.length} skills`)
    }

    // Nice-to-have overlap
    const niceSkills: string[] = o.nice_to_have_skills || []
    const niceOverlap = niceSkills.filter(s => userSkillNames.includes(s)).length
    if (niceOverlap > 0) {
      score += niceOverlap
    }

    // Industry match
    if (o.industry && (interests.includes(o.industry) || sectors.includes(o.industry))) {
      score += 5
      reasons.push(`In ${o.industry}, matching your interests`)
    }

    // Sector match
    if (o.sector && sectors.includes(o.sector)) {
      score += 3
    }

    // Location bonus
    if (o.location && userProfile?.location && o.location.toLowerCase().includes(userProfile.location.toLowerCase())) {
      score += 2
    }

    // Remote bonus
    if (o.work_mode === 'remote') {
      score += 1
    }

    // Featured/verified boost
    if (o.is_featured) score += 2
    if (o.is_verified) score += 1

    // Recency
    if (o.published_at) {
      const days = (Date.now() - new Date(o.published_at).getTime()) / (1000 * 60 * 60 * 24)
      if (days < 3) score += 2
      else if (days < 7) score += 1
    }

    // Looking-for match
    if (lookingFor.some((lf: string) => o.request_type?.includes(lf))) {
      score += 3
    }

    return { ...o, _score: score, _reasons: reasons }
  }).filter(o => o._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)

  // Enrich with owner + context
  const ownerIds = [...new Set(scored.map(s => s.owner_id).filter(Boolean))]
  const ventureIds = [...new Set(scored.map(s => s.venture_id).filter(Boolean))]
  const projectIds = [...new Set(scored.map(s => s.project_id).filter(Boolean))]

  const [ownersRes, venturesRes, projectsRes] = await Promise.all([
    ownerIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', ownerIds) : { data: [] },
    ventureIds.length ? supabase.from('ventures').select('id, slug, name, logo_url, tagline').in('id', ventureIds) : { data: [] },
    projectIds.length ? supabase.from('projects').select('id, slug, name, logo_url, tagline, icon').in('id', projectIds) : { data: [] },
  ])

  const ownerMap = new Map((ownersRes.data || []).map(u => [u.id, u]))
  const ventureMap = new Map((venturesRes.data || []).map(v => [v.id, v]))
  const projectMap = new Map((projectsRes.data || []).map(p => [p.id, p]))

  const enriched = scored.map(o => ({
    ...o,
    owner: ownerMap.get(o.owner_id) || null,
    venture: o.venture_id ? ventureMap.get(o.venture_id) || null : null,
    project: o.project_id ? projectMap.get(o.project_id) || null : null,
    match_reasons: o._reasons,
  }))

  return NextResponse.json({
    suggestions: enriched,
    mode: 'opportunities',
    user_has_skills: userSkillNames.length > 0,
    user_has_interests: interests.length > 0,
  })
}
