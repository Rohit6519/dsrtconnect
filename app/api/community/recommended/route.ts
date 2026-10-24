import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { scoreBuilderMatch, type UserContext, type BuilderCandidate } from '@/lib/algorithm/scoring'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Build user context
  const [
    { data: profile },
    { data: userSkillsRaw },
    { data: followingRaw },
    { data: connectionsRaw },
    { data: userProjects },
    { data: userVentures },
  ] = await Promise.all([
    supabase.from('users').select('interest_topics, brings, seeking, location').eq('id', user.id).single(),
    supabase.from('user_skills').select('skills(name, category)').eq('user_id', user.id),
    supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_type', 'user'),
    supabase.from('builder_connections').select('recipient_id, requester_id').or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
    supabase.from('projects').select('sector, category').eq('user_id', user.id),
    supabase.from('ventures').select('sector, industry').eq('founder_id', user.id),
  ])

  const userSkills = (userSkillsRaw || []).map((s: any) => s.skills?.name).filter(Boolean)
  const userSkillCategories = Array.from(new Set((userSkillsRaw || []).map((s: any) => s.skills?.category).filter(Boolean)))
  const projectSectors = Array.from(new Set((userProjects || []).flatMap((p: any) => [p.sector, p.category]).filter(Boolean)))
  const ventureSectors = Array.from(new Set((userVentures || []).flatMap((v: any) => [v.sector, v.industry]).filter(Boolean)))

  const excludeIds = new Set<string>([user.id])
  ;(followingRaw || []).forEach(f => excludeIds.add(f.following_id))
  ;(connectionsRaw || []).forEach((c: any) => {
    if (c.requester_id !== user.id) excludeIds.add(c.requester_id)
    if (c.recipient_id !== user.id) excludeIds.add(c.recipient_id)
  })

  const ctx: UserContext = {
    id: user.id,
    interest_topics: profile?.interest_topics || [],
    brings: profile?.brings || [],
    seeking: profile?.seeking || [],
    location: profile?.location,
    skills: userSkills,
    skill_categories: userSkillCategories,
    project_sectors: projectSectors,
    venture_sectors: ventureSectors,
  }

  // Fetch candidate builders
  const { data: candidates } = await supabase
    .from('users')
    .select(`
      id, full_name, username, avatar_url, tagline, brings, seeking,
      interest_topics, location, follower_count, execution_score,
      user_skills (skills(name, category)),
      projects:projects!projects_user_id_fkey (sector, category),
      ventures:ventures!ventures_founder_id_fkey (sector, industry)
    `)
    .eq('onboarding_complete', true)
    .not('id', 'in', `(${Array.from(excludeIds).map(id => `"${id}"`).join(',') || `"${user.id}"`})`)
    .limit(80)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ builders: [] })
  }

  // Score each
  const scored = candidates.map(c => {
    const cSkills = (c.user_skills || []).map((s: any) => s.skills?.name).filter(Boolean)
    const cSkillCats = Array.from(new Set((c.user_skills || []).map((s: any) => s.skills?.category).filter(Boolean)))
    const cSectors = Array.from(new Set([
      ...((c.projects as any[]) || []).flatMap((p: any) => [p.sector, p.category]),
      ...((c.ventures as any[]) || []).flatMap((v: any) => [v.sector, v.industry]),
    ].filter(Boolean)))

    const candidate: BuilderCandidate = {
      id: c.id,
      full_name: c.full_name,
      username: c.username,
      interest_topics: c.interest_topics,
      brings: c.brings,
      seeking: c.seeking,
      location: c.location,
      execution_score: c.execution_score,
      follower_count: c.follower_count,
      skills: cSkills,
      skill_categories: cSkillCats as string[],
      sectors: cSectors as string[],
    }

    const { score, matchPercent, reasons } = scoreBuilderMatch(candidate, ctx)
    return {
      id: c.id,
      full_name: c.full_name,
      username: c.username,
      avatar_url: c.avatar_url,
      tagline: c.tagline,
      location: c.location,
      brings: c.brings,
      top_skills: cSkills.slice(0, 3),
      institution: null, // populated below if we add it
      match_score: matchPercent,
      match_reason: reasons[0] || 'Active builder',
      match_reasons: reasons,
      raw_score: score,
    }
  })

  scored.sort((a, b) => b.raw_score - a.raw_score)

  return NextResponse.json({ builders: scored.slice(0, 12) })
}