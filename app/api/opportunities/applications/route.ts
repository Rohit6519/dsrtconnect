import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * UI filter key → DB pipeline_stage values.
 * DB constraint allows: draft, applied, submitted, pending, reviewing,
 *                       screening, interviewing, offered, hired, rejected, withdrawn
 */
const STAGE_GROUPS: Record<string, string[]> = {
  open:            ['submitted', 'applied', 'pending', 'reviewing', 'screening', 'interviewing', 'offered'],
  active_pipeline: ['reviewing', 'screening', 'interviewing', 'offered'],
  new:             ['submitted', 'applied', 'pending'],
  reviewing:       ['reviewing'],
  shortlisted:     ['screening'],
  interview:       ['interviewing'],
  offer:           ['offered'],
  accepted:        ['hired'],
  declined:        ['rejected'],
  withdrawn:       ['withdrawn'],
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const q = sp.get('q')?.trim() || ''
  const stage = sp.get('stage') || 'all'
  const opportunityId = sp.get('opportunity_id')
  const reviewer = sp.get('reviewer')
  const verified = sp.get('verified')
  const days = parseInt(sp.get('days') || '0', 10)
  const skillsCsv = sp.get('skills') || ''
  const skills = skillsCsv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const sort = sp.get('sort') || 'newest'
  const limit = Math.min(parseInt(sp.get('limit') || '30', 10), 60)
  const cursor = sp.get('cursor')

  try {
    // Resolve manageable opps: owned OR member
    const [ownedRes, membershipRes] = await Promise.all([
      supabase.from('opportunities').select('id').eq('poster_user_id', user.id),
      supabase
        .from('opportunity_members')
        .select('opportunity_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin', 'manager', 'reviewer']),
    ])

    const ownedIds = new Set<string>((ownedRes.data || []).map((o: any) => o.id))
    const memberships = (membershipRes.data || []) as any[]

    const fullAccessIds = new Set<string>([
      ...Array.from(ownedIds),
      ...memberships
        .filter((m) => ['owner', 'admin', 'manager'].includes(m.role))
        .map((m) => m.opportunity_id),
    ])

    const reviewerOnlyIds = new Set<string>(
      memberships
        .filter((m) => m.role === 'reviewer' && !fullAccessIds.has(m.opportunity_id))
        .map((m) => m.opportunity_id)
    )

    const oppIds = new Set<string>([...fullAccessIds, ...reviewerOnlyIds])

    if (opportunityId) {
      if (!oppIds.has(opportunityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (oppIds.size === 0) {
      return NextResponse.json({
        applications: [],
        stats: emptyStats(),
        next_cursor: null,
      })
    }

    const scopedIdsArr = opportunityId ? [opportunityId] : Array.from(oppIds)
    const needsReviewerScope = scopedIdsArr.some(
      (id) => reviewerOnlyIds.has(id) && !fullAccessIds.has(id)
    )

    let assignedAppIds: string[] | null = null
    if (needsReviewerScope) {
      const { data: assigns } = await supabase
        .from('opportunity_application_reviewers')
        .select('application_id')
        .eq('reviewer_id', user.id)
        .in(
          'opportunity_id',
          scopedIdsArr.filter((id) => reviewerOnlyIds.has(id) && !fullAccessIds.has(id))
        )
      assignedAppIds = (assigns || []).map((r: any) => r.application_id)
    }

    const scopedIds = scopedIdsArr

    let query = supabase
      .from('opportunity_applications')
      .select('*')
      .in('opportunity_id', scopedIds)
      .limit(limit + 1)

    // Stage filter — use real DB values
    if (stage !== 'all') {
      const grp = STAGE_GROUPS[stage]
      if (grp && grp.length > 0) {
        query = query.in('pipeline_stage', grp)
      }
    }

    if (days > 0) {
      const since = new Date(Date.now() - days * 86400000).toISOString()
      query = query.gte('created_at', since)
    }

    if (skills.length > 0) {
      query = query.overlaps('highlighted_skills', skills)
    }

    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
      if (cursor) query = query.gt('created_at', cursor)
    } else if (sort === 'stage_recent') {
      query = query.order('stage_updated_at', { ascending: false, nullsFirst: false })
      if (cursor) query = query.lt('stage_updated_at', cursor)
    } else {
      query = query.order('created_at', { ascending: false })
      if (cursor) query = query.lt('created_at', cursor)
    }

    if (needsReviewerScope) {
      const fullIdsIn = scopedIdsArr.filter((id) => fullAccessIds.has(id))
      const ids = assignedAppIds || []
      if (fullIdsIn.length > 0 && ids.length > 0) {
        query = query.or(
          `opportunity_id.in.(${fullIdsIn.join(',')}),id.in.(${ids.join(',')})`
        )
      } else if (fullIdsIn.length > 0) {
        query = query.in('opportunity_id', fullIdsIn)
      } else if (ids.length > 0) {
        query = query.in('id', ids)
      } else {
        return NextResponse.json({
          applications: [],
          stats: emptyStats(),
          next_cursor: null,
        })
      }
    }

    const { data: apps, error } = await query
    if (error) throw error

    const rows = apps || []
    const hasMore = rows.length > limit
    const trimmed = hasMore ? rows.slice(0, limit) : rows

    const applicantIds = [
      ...new Set(trimmed.map((a: any) => a.applicant_id).filter(Boolean)),
    ]
    const uniqueOppIds = [...new Set(trimmed.map((a: any) => a.opportunity_id))]
    const appIds = trimmed.map((a: any) => a.id)

    const [{ data: users }, { data: oppMeta }, { data: reviewers }] = await Promise.all([
      applicantIds.length
        ? supabase
            .from('users')
            .select(
              'id, username, full_name, avatar_url, tagline, is_verified, location, profile_tags'
            )
            .in('id', applicantIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('opportunities')
        .select(
          'id, slug, title, opportunity_type, status, required_skills, opportunity_number'
        )
        .in('id', uniqueOppIds),
      appIds.length
        ? supabase
            .from('opportunity_application_reviewers')
            .select('application_id, reviewer_id, assigned_at')
            .in('application_id', appIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const userMap = new Map((users || []).map((u: any) => [u.id, u]))
    const oppMap = new Map((oppMeta || []).map((o: any) => [o.id, o]))
    const revByApp = new Map<string, any[]>()
    for (const r of reviewers || []) {
      const arr = revByApp.get(r.application_id) || []
      arr.push(r)
      revByApp.set(r.application_id, arr)
    }

    let finalRows = trimmed.map((a: any) => {
      const u = userMap.get(a.applicant_id) || a.applicant_snapshot || null
      const opp = oppMap.get(a.opportunity_id) || null
      const revs = revByApp.get(a.id) || []
      return { ...a, applicant: u, opportunity: opp, reviewers: revs }
    })

    if (reviewer === 'unassigned') {
      finalRows = finalRows.filter((a: any) => !a.reviewers || a.reviewers.length === 0)
    } else if (reviewer) {
      finalRows = finalRows.filter((a: any) =>
        a.reviewers?.some((r: any) => r.reviewer_id === reviewer)
      )
    }

    if (verified === 'true') {
      finalRows = finalRows.filter((a: any) => a.applicant?.is_verified === true)
    } else if (verified === 'false') {
      finalRows = finalRows.filter((a: any) => a.applicant?.is_verified !== true)
    }

    if (q) {
      const qq = q.toLowerCase()
      finalRows = finalRows.filter((a: any) => {
        const name = (a.applicant?.full_name || a.applicant?.username || '').toLowerCase()
        const title = (a.opportunity?.title || '').toLowerCase()
        const skillsHit = (a.highlighted_skills || []).join(' ').toLowerCase().includes(qq)
        return name.includes(qq) || title.includes(qq) || skillsHit
      })
    }

    let statsOppIds = scopedIds
    if (needsReviewerScope) {
      const fullIdsIn = scopedIdsArr.filter((id) => fullAccessIds.has(id))
      const assignedOppIds = trimmed
        .filter((a: any) => (assignedAppIds || []).includes(a.id))
        .map((a: any) => a.opportunity_id)
      statsOppIds = Array.from(new Set([...fullIdsIn, ...assignedOppIds]))
    }

    const statCounts = await computeStats(supabase, statsOppIds, { days })

    return NextResponse.json({
      applications: finalRows,
      stats: statCounts,
      next_cursor: hasMore
        ? sort === 'stage_recent'
          ? trimmed[trimmed.length - 1]?.stage_updated_at
          : trimmed[trimmed.length - 1]?.created_at
        : null,
    })
  } catch (e: any) {
    console.error('applications list error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

function emptyStats() {
  return {
    total: 0,
    new: 0,
    reviewing: 0,
    shortlisted: 0,
    interview: 0,
    offer: 0,
    accepted: 0,
    declined: 0,
    withdrawn: 0,
  }
}

async function computeStats(
  supabase: any,
  oppIds: string[],
  opts: { days?: number }
) {
  if (oppIds.length === 0) return emptyStats()
  const stats = emptyStats()

  // Map UI stat key → DB stage list (must match STAGE_GROUPS)
  const stageMap: Record<keyof ReturnType<typeof emptyStats>, string[]> = {
    total:       [],
    new:         ['submitted', 'applied', 'pending'],
    reviewing:   ['reviewing'],
    shortlisted: ['screening'],
    interview:   ['interviewing'],
    offer:       ['offered'],
    accepted:    ['hired'],
    declined:    ['rejected'],
    withdrawn:   ['withdrawn'],
  }

  const since =
    opts.days && opts.days > 0
      ? new Date(Date.now() - opts.days * 86400000).toISOString()
      : null

  // Total
  {
    let q = supabase
      .from('opportunity_applications')
      .select('id', { count: 'exact', head: true })
      .in('opportunity_id', oppIds)
    if (since) q = q.gte('created_at', since)
    const { count } = await q
    stats.total = count || 0
  }

  // Per stage group (run in parallel for speed)
  const keys = Object.keys(stageMap).filter(k => k !== 'total') as (keyof ReturnType<typeof emptyStats>)[]
  const results = await Promise.all(
    keys.map(async (k) => {
      const stages = stageMap[k]
      if (!stages || stages.length === 0) return { k, count: 0 }
      let q = supabase
        .from('opportunity_applications')
        .select('id', { count: 'exact', head: true })
        .in('opportunity_id', oppIds)
        .in('pipeline_stage', stages)
      if (since) q = q.gte('created_at', since)
      const { count } = await q
      return { k, count: count || 0 }
    })
  )
  for (const r of results) {
    stats[r.k] = r.count
  }

  return stats
}