import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/my-hirings
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'all'

  let tuQuery = supabase.from('team_up_requests').select('*').eq('user_id', user.id)
  const { data: standalone } = await tuQuery.order('created_at', { ascending: false })

  const { data: ventures } = await supabase.from('ventures').select('id, name, slug, logo_url').eq('user_id', user.id)
  const ventureIds = (ventures || []).map(v => v.id)
  const { data: ventureOpps } = ventureIds.length
    ? await supabase.from('venture_looking_for').select('*').in('venture_id', ventureIds).order('created_at', { ascending: false })
    : { data: [] }

  const { data: projects } = await supabase.from('projects')
    .select('id, name, slug, logo_url, icon').or(`founder_id.eq.${user.id},user_id.eq.${user.id}`)
  const projectIds = (projects || []).map(p => p.id)
  const { data: projectRoles } = projectIds.length
    ? await supabase.from('project_roles').select('*').in('project_id', projectIds).order('joined_at', { ascending: false })
    : { data: [] }

  const ventureMap = new Map((ventures || []).map(v => [v.id, v]))
  const projectMap = new Map((projects || []).map(p => [p.id, p]))

  const items: any[] = [
    ...(standalone || []).map(r => ({
      ...r,
      source_type: 'team_up',
      source_id: r.id,
      display_title: r.title,
      display_status: r.status,
      display_created: r.created_at,
      display_deadline: r.application_deadline,
      display_positions: r.positions_open,
      context: null,
    })),
    ...(ventureOpps || []).map(v => ({
      ...v,
      source_type: 'venture_lf',
      source_id: v.id,
      display_title: v.title,
      display_status: v.status,
      display_created: v.created_at,
      display_deadline: v.closes_at,
      display_positions: v.count,
      context: {
        type: 'venture',
        ...ventureMap.get(v.venture_id),
      },
    })),
    ...(projectRoles || []).map(r => ({
      ...r,
      source_type: 'project_role',
      source_id: r.id,
      display_title: r.role || 'Team Member',
      display_status: r.status,
      display_created: r.joined_at,
      display_deadline: r.closes_at,
      display_positions: r.positions_open,
      context: {
        type: 'project',
        ...projectMap.get(r.project_id),
      },
    })),
  ]

  // Real application counts
  const allSources = items.map(i => ({ source_type: i.source_type, source_id: i.source_id }))
  const appCountMap = new Map<string, number>()

  for (const src of allSources) {
    const filterQ: any = {}
    if (src.source_type === 'team_up') filterQ.request_id = src.source_id
    else if (src.source_type === 'venture_lf') filterQ.venture_lf_id = src.source_id
    else if (src.source_type === 'project_role') filterQ.project_role_id = src.source_id

    const { count } = await supabase
      .from('looking_for_applications')
      .select('*', { count: 'exact', head: true })
      .match(filterQ)
    appCountMap.set(`${src.source_type}:${src.source_id}`, count || 0)
  }

  // Shortlisted counts
  const shortlistCountMap = new Map<string, number>()
  for (const src of allSources) {
    const filterQ: any = { pipeline_stage: 'shortlisted' }
    if (src.source_type === 'team_up') filterQ.request_id = src.source_id
    else if (src.source_type === 'venture_lf') filterQ.venture_lf_id = src.source_id
    else if (src.source_type === 'project_role') filterQ.project_role_id = src.source_id

    const { count } = await supabase
      .from('looking_for_applications')
      .select('*', { count: 'exact', head: true })
      .match(filterQ)
    shortlistCountMap.set(`${src.source_type}:${src.source_id}`, count || 0)
  }

  let enriched = items.map(i => ({
    ...i,
    real_application_count: appCountMap.get(`${i.source_type}:${i.source_id}`) || 0,
    shortlisted_count: shortlistCountMap.get(`${i.source_type}:${i.source_id}`) || 0,
  }))

  enriched.sort((a: any, b: any) =>
    new Date(b.display_created || 0).getTime() - new Date(a.display_created || 0).getTime()
  )

  const isActive = (s: string) => ['active', 'published', 'open', 'closing_soon'].includes(s)
  const isDraft  = (s: string) => s === 'draft'
  const isClosed = (s: string) => ['closed', 'filled', 'archived'].includes(s)

  if (filter === 'active')  enriched = enriched.filter(i => isActive(i.display_status))
  if (filter === 'drafts')  enriched = enriched.filter(i => isDraft(i.display_status))
  if (filter === 'closed')  enriched = enriched.filter(i => isClosed(i.display_status))

  const allItems = items.map(i => ({
    ...i,
    real_application_count: appCountMap.get(`${i.source_type}:${i.source_id}`) || 0,
    shortlisted_count: shortlistCountMap.get(`${i.source_type}:${i.source_id}`) || 0,
  }))

  const stats = {
    total: allItems.length,
    active: allItems.filter(i => isActive(i.display_status)).length,
    drafts: allItems.filter(i => isDraft(i.display_status)).length,
    closed: allItems.filter(i => isClosed(i.display_status)).length,
    total_applications: allItems.reduce((s, i) => s + i.real_application_count, 0),
    total_shortlisted: allItems.reduce((s, i) => s + i.shortlisted_count, 0),
    total_openings: allItems.reduce((s, i) => s + (i.display_positions || 0), 0),
  }

  return NextResponse.json({ items: enriched, stats })
}
