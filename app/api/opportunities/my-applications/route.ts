import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DB pipeline_stage constraint:
 *   draft, applied, submitted, pending, reviewing, screening,
 *   interviewing, offered, hired, rejected, withdrawn
 *
 * UI grouping:
 *   active      → not-yet-finalized  (applied/submitted/pending/reviewing)
 *   shortlisted → screening
 *   interviews  → interviewing
 *   offers      → offered
 *   selected    → hired
 *   rejected    → rejected
 *   withdrawn   → withdrawn
 *   drafts      → draft
 */
const GROUP_TO_DB: Record<string, string[]> = {
  active:      ['applied', 'submitted', 'pending', 'reviewing'],
  reviewing:   ['reviewing'],
  shortlisted: ['screening'],
  interviews:  ['interviewing'],
  offers:      ['offered'],
  completed:   ['hired', 'rejected'],
  selected:    ['hired'],
  rejected:    ['rejected'],
  withdrawn:   ['withdrawn'],
  drafts:      ['draft'],
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  draft:        "You started this application but haven't submitted it yet.",
  applied:      'Your application has been received and is waiting to be reviewed.',
  submitted:    'Your application has been received and is waiting to be reviewed.',
  pending:      'Your application has been received and is waiting to be reviewed.',
  reviewing:    'Your application is currently being reviewed by the team.',
  screening:    "You've moved forward in the selection process.",
  interviewing: 'The team wants to speak with you about this opportunity.',
  offered:      "You've received an offer for this opportunity.",
  hired:        "You've been selected for this opportunity.",
  rejected:     'This opportunity has moved forward with other applicants.',
  withdrawn:    'You withdrew this application.',
}

const WITHDRAWABLE_STAGES = new Set([
  'applied',
  'submitted',
  'pending',
  'reviewing',
  'screening',
  'interviewing',
])

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const filter = sp.get('filter') || 'all'
  const search = sp.get('search')?.trim() || ''
  const sort = sp.get('sort') || 'recent_activity'
  const cursor = sp.get('cursor')
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 50)

  try {
    // 1. Base query
    let query = supabase
      .from('opportunity_applications')
      .select('*')
      .eq('applicant_id', user.id)

    // Filter
    if (filter !== 'all') {
      const stages = GROUP_TO_DB[filter]
      if (stages && stages.length > 0) {
        query = query.in('pipeline_stage', stages)
      }
    }

    // Sort
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
      if (cursor) query = query.gt('created_at', cursor)
    } else if (sort === 'recently_applied') {
      query = query.order('created_at', { ascending: false })
      if (cursor) query = query.lt('created_at', cursor)
    } else if (sort === 'title') {
      query = query.order('created_at', { ascending: false })
    } else {
      // recent_activity (default) — fall back to updated_at when stage_updated_at is null
      query = query.order('stage_updated_at', { ascending: false, nullsFirst: false })
      if (cursor) query = query.lt('stage_updated_at', cursor)
    }

    query = query.limit(limit + 1)

    const { data: apps, error } = await query
    if (error) throw error

    const items = apps || []
    const hasMore = items.length > limit
    const trimmed = hasMore ? items.slice(0, limit) : items

    // 2. Stats over the full applicant set
    const { data: allApps } = await supabase
      .from('opportunity_applications')
      .select('id, pipeline_stage')
      .eq('applicant_id', user.id)

    const all = allApps || []
    const inStage = (s: string[]) => all.filter(a => s.includes(a.pipeline_stage)).length

    const stats = {
      total:       all.length,
      active:      inStage(GROUP_TO_DB.active),
      reviewing:   inStage(GROUP_TO_DB.reviewing),
      shortlisted: inStage(GROUP_TO_DB.shortlisted),
      interviews:  inStage(GROUP_TO_DB.interviews),
      offers:      inStage(GROUP_TO_DB.offers),
      completed:   inStage(GROUP_TO_DB.completed),
      selected:    inStage(GROUP_TO_DB.selected),
      rejected:    inStage(GROUP_TO_DB.rejected),
      withdrawn:   inStage(GROUP_TO_DB.withdrawn),
      drafts:      inStage(GROUP_TO_DB.drafts),
    }

    // 3. Enrich opportunities
    const oppIds = [...new Set(trimmed.map(a => a.opportunity_id))]
    const { data: opps } = oppIds.length
      ? await supabase
          .from('opportunities')
          .select(
            'id, slug, title, opportunity_number, opportunity_type, status, cover_image_url, poster_user_id, project_id, venture_id'
          )
          .in('id', oppIds)
      : { data: [] as any[] }

    const oppMap = new Map((opps || []).map((o: any) => [o.id, o]))

    const projectIds = [...new Set((opps || []).map((o: any) => o.project_id).filter(Boolean))]
    const ventureIds = [...new Set((opps || []).map((o: any) => o.venture_id).filter(Boolean))]

    const [projectsRes, venturesRes] = await Promise.all([
      projectIds.length
        ? supabase.from('projects').select('id, name, icon').in('id', projectIds)
        : { data: [] as any[] },
      ventureIds.length
        ? supabase.from('ventures').select('id, name, logo_url').in('id', ventureIds)
        : { data: [] as any[] },
    ])

    const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
    const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))

    // 4. Unread messages
    const { data: messages } = trimmed.length
      ? await supabase
          .from('inbox_messages')
          .select('metadata')
          .eq('recipient_id', user.id)
          .eq('status', 'unread')
          .eq('reference_type', 'opportunity')
      : { data: [] as any[] }

    const unreadMap = new Map<string, number>()
    for (const m of messages || []) {
      const aId = (m as any).metadata?.opportunity_application_id
      if (aId) unreadMap.set(aId, (unreadMap.get(aId) || 0) + 1)
    }

    // 5. Merge
    let enriched = trimmed.map((app: any) => {
      const opp: any = oppMap.get(app.opportunity_id)
      if (opp) {
        opp.project = opp.project_id ? projectMap.get(opp.project_id) : null
        opp.venture = opp.venture_id ? ventureMap.get(opp.venture_id) : null
      }
      return {
        ...app,
        opportunity: opp || null,
        unread_messages: unreadMap.get(app.id) || 0,
        status_description: STATUS_DESCRIPTIONS[app.pipeline_stage] || '',
        withdrawable: WITHDRAWABLE_STAGES.has(app.pipeline_stage),
        capabilities: {
          can_withdraw: WITHDRAWABLE_STAGES.has(app.pipeline_stage),
          can_edit: app.pipeline_stage === 'draft',
          can_reapply: app.pipeline_stage === 'withdrawn',
        },
      }
    })

    // 6. Search filter (post-enrich)
    if (search) {
      const s = search.toLowerCase()
      enriched = enriched.filter((a: any) => {
        const title = (a.opportunity?.title || '').toLowerCase()
        const project = (a.opportunity?.project?.name || '').toLowerCase()
        const venture = (a.opportunity?.venture?.name || '').toLowerCase()
        return title.includes(s) || project.includes(s) || venture.includes(s)
      })
    }

    if (sort === 'title') {
      enriched.sort((a: any, b: any) =>
        (a.opportunity?.title || '').localeCompare(b.opportunity?.title || '')
      )
    }

    const nextCursor = hasMore
      ? sort === 'oldest' || sort === 'recently_applied'
        ? trimmed[trimmed.length - 1]?.created_at
        : trimmed[trimmed.length - 1]?.stage_updated_at
      : null

    return NextResponse.json({
      applications: enriched,
      stats,
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, applications: [], stats: {} }, { status: 500 })
  }
}