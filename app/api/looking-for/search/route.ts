import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/search?q=xxx&scope=all|opportunities|people|projects|ventures|skills
// Unified search across the entire DSRT surface for Team Up
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)

  const q = (searchParams.get('q') || '').trim()
  const scope = searchParams.get('scope') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20)

  if (!q || q.length < 2) {
    return NextResponse.json({
      query: q,
      scope,
      groups: { opportunities: [], people: [], projects: [], ventures: [], skills: [] },
      total: 0,
    })
  }

  const like = `%${q}%`
  const wantAll = scope === 'all'

  // Parallel fetches
  const [oppsRes, peopleRes, projectsRes, venturesRes, skillsRes] = await Promise.all([
    (wantAll || scope === 'opportunities')
      ? supabase.from('team_up_unified')
          .select('id, source_type, source_id, title, tagline, request_type, industry, required_skills, owner_id, venture_id, project_id, published_at, is_featured, is_verified, application_count, view_count')
          .or(`title.ilike.${like},tagline.ilike.${like},description.ilike.${like}`)
          .limit(limit * 2)
      : Promise.resolve({ data: [] as any[] }),

    (wantAll || scope === 'people')
      ? supabase.from('users')
          .select('id, username, full_name, avatar_url, tagline, is_verified, is_open_to_work, location, execution_score')
          .or(`full_name.ilike.${like},username.ilike.${like},tagline.ilike.${like}`)
          .limit(limit)
      : Promise.resolve({ data: [] as any[] }),

    (wantAll || scope === 'projects')
      ? supabase.from('projects')
          .select('id, slug, name, tagline, icon, logo_url, industry, sector, follower_count, is_public')
          .or(`name.ilike.${like},tagline.ilike.${like},description.ilike.${like}`)
          .eq('is_public', true)
          .limit(limit)
      : Promise.resolve({ data: [] as any[] }),

    (wantAll || scope === 'ventures')
      ? supabase.from('ventures')
          .select('id, slug, name, tagline, logo_url, industry, stage, is_verified')
          .or(`name.ilike.${like},tagline.ilike.${like},description.ilike.${like}`)
          .limit(limit)
      : Promise.resolve({ data: [] as any[] }),

    (wantAll || scope === 'skills')
      ? supabase.from('skills')
          .select('id, name, slug, category, usage_count')
          .ilike('name', like)
          .order('usage_count', { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const opps = oppsRes.data || []
  const people = peopleRes.data || []
  const projects = projectsRes.data || []
  const ventures = venturesRes.data || []
  const skills = skillsRes.data || []

  // Enrich opportunities with owner/venture/project
  const ownerIds = [...new Set(opps.map((o: any) => o.owner_id).filter(Boolean))]
  const oppVentureIds = [...new Set(opps.map((o: any) => o.venture_id).filter(Boolean))]
  const oppProjectIds = [...new Set(opps.map((o: any) => o.project_id).filter(Boolean))]

  const [ownersRes, ovRes, opRes] = await Promise.all([
    ownerIds.length ? supabase.from('users').select('id, username, full_name, avatar_url').in('id', ownerIds) : { data: [] as any[] },
    oppVentureIds.length ? supabase.from('ventures').select('id, name, slug, logo_url').in('id', oppVentureIds) : { data: [] as any[] },
    oppProjectIds.length ? supabase.from('projects').select('id, name, slug, logo_url, icon').in('id', oppProjectIds) : { data: [] as any[] },
  ])

  const ownerMap = new Map((ownersRes.data || []).map((u: any) => [u.id, u]))
  const ovMap = new Map((ovRes.data || []).map((v: any) => [v.id, v]))
  const opMap = new Map((opRes.data || []).map((p: any) => [p.id, p]))

  // Score opportunities for ranking
  const scoredOpps = opps.map((o: any) => {
    let score = 0
    const t = o.title?.toLowerCase() || ''
    const qLower = q.toLowerCase()
    if (t === qLower) score += 100
    else if (t.startsWith(qLower)) score += 50
    else if (t.includes(qLower)) score += 20
    if ((o.tagline || '').toLowerCase().includes(qLower)) score += 10
    if ((o.required_skills || []).some((s: string) => s.toLowerCase().includes(qLower))) score += 15
    if (o.is_featured) score += 5
    if (o.is_verified) score += 3
    if (o.published_at) {
      const days = (Date.now() - new Date(o.published_at).getTime()) / 86400000
      if (days < 7) score += 4
      else if (days < 30) score += 2
    }
    return { ...o, _rank: score }
  }).sort((a: any, b: any) => b._rank - a._rank).slice(0, limit)

  return NextResponse.json({
    query: q,
    scope,
    groups: {
      opportunities: scoredOpps.map((o: any) => ({
        id: o.id,
        source_type: o.source_type,
        source_id: o.source_id,
        title: o.title,
        tagline: o.tagline,
        request_type: o.request_type,
        industry: o.industry,
        required_skills: o.required_skills || [],
        published_at: o.published_at,
        application_count: o.application_count,
        view_count: o.view_count,
        is_featured: o.is_featured,
        is_verified: o.is_verified,
        owner: ownerMap.get(o.owner_id) || null,
        venture: o.venture_id ? ovMap.get(o.venture_id) || null : null,
        project: o.project_id ? opMap.get(o.project_id) || null : null,
      })),
      people,
      projects,
      ventures,
      skills,
    },
    total: opps.length + people.length + projects.length + ventures.length + skills.length,
  })
}
