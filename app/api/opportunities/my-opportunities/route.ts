import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DB pipeline_stage constraint:
 *   draft, applied, submitted, pending, reviewing, screening,
 *   interviewing, offered, hired, rejected, withdrawn
 *
 * Column groupings shown in the portfolio table:
 *   applications = every non-draft application
 *   awaiting     = applied / submitted / pending   (owner hasn't triaged yet)
 *   in_progress  = reviewing / screening / interviewing / offered
 *   finalized    = hired / rejected / withdrawn
 */
const NEW_STAGES = ['applied', 'submitted', 'pending']
const IN_PROGRESS_STAGES = ['reviewing', 'screening', 'interviewing', 'offered']
const FINALIZED_STAGES = ['hired', 'rejected', 'withdrawn']
const COUNTABLE_STAGES = [...NEW_STAGES, ...IN_PROGRESS_STAGES, ...FINALIZED_STAGES]

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'all'
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()
  const linked = searchParams.get('linked')
  const type = searchParams.get('type')

  try {
    let query = supabase
      .from('opportunities')
      .select('*, primary_category:opportunity_categories!primary_category_id(name, slug)')
      .eq('poster_user_id', user.id)
      .order('last_activity_at', { ascending: false, nullsFirst: false })

    if (status) {
      query = query.eq('status', status)
    } else {
      if (filter === 'active') query = query.in('status', ['active', 'closing-soon'])
      else if (filter === 'drafts') query = query.eq('status', 'draft')
      else if (filter === 'paused') query = query.eq('status', 'paused')
      else if (filter === 'closed') query = query.in('status', ['closed', 'filled', 'expired'])
      else if (filter === 'archived') query = query.eq('status', 'archived')
    }

    if (type) query = query.eq('opportunity_type', type)
    if (linked === 'project') query = query.not('project_id', 'is', null)
    else if (linked === 'venture') query = query.not('venture_id', 'is', null)
    else if (linked === 'organization') query = query.not('organization_id', 'is', null)
    else if (linked === 'community') query = query.not('community_id', 'is', null)
    else if (linked === 'none')
      query = query
        .is('project_id', null)
        .is('venture_id', null)
        .is('organization_id', null)
        .is('community_id', null)

    if (q && q.length >= 2) {
      query = query.or(
        `title.ilike.%${q}%,opportunity_number.ilike.%${q}%,description.ilike.%${q}%`
      )
    }

    const { data: items, error } = await query
    if (error) throw error

    const opportunities = (items || []) as any[]
    const oppIds = opportunities.map((o) => o.id)

    // --- LIVE COUNTS PER OPPORTUNITY ---
    // Pull only the columns we need and aggregate in JS.
    // This avoids depending on stale trigger-maintained counters.
    const countsByOpp = new Map<string, { total: number; awaiting: number; in_progress: number; finalized: number }>()

    if (oppIds.length > 0) {
      const { data: allApps } = await supabase
        .from('opportunity_applications')
        .select('opportunity_id, pipeline_stage')
        .in('opportunity_id', oppIds)
        .in('pipeline_stage', COUNTABLE_STAGES)

      for (const oid of oppIds) {
        countsByOpp.set(oid, { total: 0, awaiting: 0, in_progress: 0, finalized: 0 })
      }

      for (const row of allApps || []) {
        const bucket = countsByOpp.get(row.opportunity_id)
        if (!bucket) continue
        bucket.total += 1
        if (NEW_STAGES.includes(row.pipeline_stage)) bucket.awaiting += 1
        else if (IN_PROGRESS_STAGES.includes(row.pipeline_stage)) bucket.in_progress += 1
        else if (FINALIZED_STAGES.includes(row.pipeline_stage)) bucket.finalized += 1
      }
    }

    // --- Enrich linked project/venture ---
    const projectIds = [...new Set(opportunities.map((o) => o.project_id).filter(Boolean))]
    const ventureIds = [...new Set(opportunities.map((o) => o.venture_id).filter(Boolean))]

    const [projectsRes, venturesRes] = await Promise.all([
      projectIds.length
        ? supabase.from('projects').select('id, slug, name, icon, cover_image_url').in('id', projectIds)
        : Promise.resolve({ data: [] as any[] }),
      ventureIds.length
        ? supabase.from('ventures').select('id, slug, name, logo_url').in('id', ventureIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const projectMap = new Map(((projectsRes.data || []) as any[]).map((p: any) => [p.id, p]))
    const ventureMap = new Map(((venturesRes.data || []) as any[]).map((v: any) => [v.id, v]))

    // Attach live counts + linked entities to each opportunity
    const enriched = opportunities.map((o: any) => {
      const c = countsByOpp.get(o.id) || { total: 0, awaiting: 0, in_progress: 0, finalized: 0 }
      return {
        ...o,
        project: o.project_id ? projectMap.get(o.project_id) || null : null,
        venture: o.venture_id ? ventureMap.get(o.venture_id) || null : null,

        // Live-computed values used by PortfolioTable:
        application_count: c.total,          // "Applications" column
        awaiting_count: c.awaiting,          // "Awaiting" column
        qualified_count: c.in_progress,      // "In progress" column (kept name so UI works)
        finalized_count: c.finalized,        // (available if you want it later)
      }
    })

    // Portfolio-level aggregates
    const stats = {
      total: enriched.length,
      active: enriched.filter((o: any) => ['active', 'closing-soon'].includes(o.status)).length,
      drafts: enriched.filter((o: any) => o.status === 'draft').length,
      paused: enriched.filter((o: any) => o.status === 'paused').length,
      closed: enriched.filter((o: any) => ['closed', 'filled', 'expired', 'archived'].includes(o.status)).length,
      total_applications: enriched.reduce((s: number, o: any) => s + (o.application_count || 0), 0),
      total_qualified: enriched.reduce((s: number, o: any) => s + (o.qualified_count || 0), 0),
      total_awaiting: enriched.reduce((s: number, o: any) => s + (o.awaiting_count || 0), 0),
      total_views: enriched.reduce((s: number, o: any) => s + (o.view_count || 0), 0),
      total_saves: enriched.reduce((s: number, o: any) => s + (o.save_count || 0), 0),
    }

    return NextResponse.json({ opportunities: enriched, stats })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message, opportunities: [], stats: {} },
      { status: 500 }
    )
  }
}