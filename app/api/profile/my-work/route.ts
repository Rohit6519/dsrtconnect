import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  // ── Projects: founder OR user_id owner ───────────────────────────────
  const { data: ownedProjectsData } = await supabase
    .from('projects')
    .select(
      'id, name, slug, tagline, description, stage, status, is_featured, ' +
      'cover_image_url, tech_stack, traction_score, progress_percent, ' +
      'sector, category, founder_id, user_id, created_at, updated_at'
    )
    .or(`founder_id.eq.${userId},user_id.eq.${userId}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  const ownedProjects = (ownedProjectsData as any[]) || []

  // ── Projects: member via project_members (best-effort) ───────────────
  let memberProjects: any[] = []
  try {
    const { data: memberRows } = await supabase
      .from('project_members')
      .select(`
        role,
        project:project_id (
          id, name, slug, tagline, description, stage, status, is_featured,
          cover_image_url, tech_stack, traction_score, progress_percent,
          sector, category, founder_id, user_id, created_at, updated_at
        )
      `)
      .eq('user_id', userId)

    if (memberRows) {
      memberProjects = (memberRows as any[])
        .map((r: any) => (r.project ? { ...r.project, _member_role: r.role } : null))
        .filter(Boolean)
    }
  } catch {
    // silent fail
  }

  // ── Ventures: founder OR user_id owner ───────────────────────────────
  const { data: ownedVenturesData } = await supabase
    .from('ventures')
    .select(
      'id, name, slug, tagline, description, stage, status, is_featured, ' +
      'logo_url, industry, sector, follower_count, founder_id, user_id, created_at, updated_at'
    )
    .or(`founder_id.eq.${userId},user_id.eq.${userId}`)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  const ownedVentures = (ownedVenturesData as any[]) || []

  // ── Ventures: team member (best-effort) ──────────────────────────────
  let memberVentures: any[] = []
  try {
    const { data: memberRows } = await supabase
      .from('venture_team_members')
      .select(`
        role,
        venture:venture_id (
          id, name, slug, tagline, description, stage, status, is_featured,
          logo_url, industry, sector, follower_count, founder_id, user_id, created_at, updated_at
        )
      `)
      .eq('user_id', userId)

    if (memberRows) {
      memberVentures = (memberRows as any[])
        .map((r: any) => (r.venture ? { ...r.venture, _member_role: r.role } : null))
        .filter(Boolean)
    }
  } catch {
    // silent fail
  }

  // ── Dedupe projects ──────────────────────────────────────────────────
  const seenProjectIds = new Set<string>()
  const projectMap = new Map<string, any>()

  for (const p of ownedProjects) {
    if (p && p.id && !seenProjectIds.has(p.id)) {
      projectMap.set(p.id, {
        ...p,
        _role: p.founder_id === userId || p.user_id === userId ? 'founder' : 'member',
      })
      seenProjectIds.add(p.id)
    }
  }
  for (const p of memberProjects) {
    if (p && p.id && !seenProjectIds.has(p.id)) {
      projectMap.set(p.id, { ...p, _role: p._member_role || 'member' })
      seenProjectIds.add(p.id)
    }
  }

  // ── Dedupe ventures ──────────────────────────────────────────────────
  const seenVentureIds = new Set<string>()
  const ventureMap = new Map<string, any>()

  for (const v of ownedVentures) {
    if (v && v.id && !seenVentureIds.has(v.id)) {
      ventureMap.set(v.id, {
        ...v,
        _role: v.founder_id === userId || v.user_id === userId ? 'founder' : 'member',
      })
      seenVentureIds.add(v.id)
    }
  }
  for (const v of memberVentures) {
    if (v && v.id && !seenVentureIds.has(v.id)) {
      ventureMap.set(v.id, { ...v, _role: v._member_role || 'member' })
      seenVentureIds.add(v.id)
    }
  }

  // ── Fetch user's personal stories for these items ────────────────────
  const storyMap = new Map<string, { story_html: string | null; attachments: any[] }>()
  try {
    const { data: stories } = await supabase
      .from('user_work_stories')
      .select('*')
      .eq('user_id', userId)

    if (stories) {
      for (const s of (stories as any[])) {
        if (s?.entity_type && s?.entity_id) {
          storyMap.set(`${s.entity_type}_${s.entity_id}`, {
            story_html: s.story_html,
            attachments: Array.isArray(s.attachments) ? s.attachments : [],
          })
        }
      }
    }
  } catch {
    // silent fail
  }

  const projects = Array.from(projectMap.values()).map((p: any) => ({
    ...p,
    _type: 'project' as const,
    _story: storyMap.get(`project_${p.id}`) || null,
  }))

  const ventures = Array.from(ventureMap.values()).map((v: any) => ({
    ...v,
    _type: 'venture' as const,
    _story: storyMap.get(`venture_${v.id}`) || null,
  }))

  return NextResponse.json({
    projects,
    ventures,
    counts: {
      projects: projects.length,
      ventures: ventures.length,
      total: projects.length + ventures.length,
    },
  })
}