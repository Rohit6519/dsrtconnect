import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/founder?user_id=<id>
 *
 * Returns founder-mode data:
 * - Ventures where user is founder (founder_id or user_id owner)
 * - Aggregated stats (total ventures, active, total followers)
 * - Team member counts per venture
 * - Journey events tagged as founder milestones
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  // ── Ventures where user is founder ────────────────────────────────
  const { data: ventures, error: ventErr } = await supabase
    .from('ventures')
    .select(
      'id, name, slug, tagline, description, stage, status, ' +
      'logo_url, industry, sector, follower_count, is_featured, ' +
      'created_at, founder_id, user_id'
    )
    .or(`founder_id.eq.${userId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (ventErr) {
    console.error('Founder ventures error:', ventErr)
    return NextResponse.json({ error: ventErr.message }, { status: 500 })
  }

  const ventureList = ventures || []
  const ventureIds = ventureList.map((v: any) => v.id)

  // ── Team member counts per venture (best-effort) ──────────────────
  const teamCounts: Record<string, number> = {}
  if (ventureIds.length > 0) {
    try {
      const { data: teamRows } = await supabase
        .from('venture_team_members')
        .select('venture_id')
        .in('venture_id', ventureIds)

      if (teamRows) {
        for (const row of teamRows) {
          teamCounts[row.venture_id] = (teamCounts[row.venture_id] || 0) + 1
        }
      }
    } catch {
      // silent fail
    }
  }

  // ── Recent growth entries per venture (best-effort) ───────────────
  const growthByVenture: Record<string, any[]> = {}
  if (ventureIds.length > 0) {
    try {
      const { data: growthRows } = await supabase
        .from('venture_growth_entries')
        .select('venture_id, metric_name, value, recorded_at, unit')
        .in('venture_id', ventureIds)
        .order('recorded_at', { ascending: false })
        .limit(50)

      if (growthRows) {
        for (const g of growthRows) {
          if (!growthByVenture[g.venture_id]) growthByVenture[g.venture_id] = []
          if (growthByVenture[g.venture_id].length < 3) {
            growthByVenture[g.venture_id].push(g)
          }
        }
      }
    } catch {
      // silent fail
    }
  }

  // ── Funding rounds (best-effort) ──────────────────────────────────
  const fundingByVenture: Record<string, any[]> = {}
  if (ventureIds.length > 0) {
    try {
      const { data: fundingRows } = await supabase
        .from('venture_funding_rounds')
        .select('venture_id, round_type, amount, currency, raised_at, investors')
        .in('venture_id', ventureIds)
        .order('raised_at', { ascending: false })

      if (fundingRows) {
        for (const f of fundingRows) {
          if (!fundingByVenture[f.venture_id]) fundingByVenture[f.venture_id] = []
          fundingByVenture[f.venture_id].push(f)
        }
      }
    } catch {
      // silent fail
    }
  }

  // ── Enriched venture list ─────────────────────────────────────────
  const enrichedVentures = ventureList.map((v: any) => ({
    ...v,
    team_size: teamCounts[v.id] || 1,     // 1 = at least the founder
    recent_growth: growthByVenture[v.id] || [],
    funding_rounds: fundingByVenture[v.id] || [],
  }))

  // ── Journey events (founder milestones) ───────────────────────────
  const { data: journeyRows } = await supabase
    .from('journey_events')
    .select('id, title, description, category, event_date, entity_type, entity_id')
    .eq('user_id', userId)
    .eq('visible', true)
    .order('event_date', { ascending: false })
    .limit(30)

  const journey = (journeyRows || []).filter((j: any) => {
    const cat = (j.category || '').toLowerCase()
    return [
      'venture_launched', 'venture_founded', 'funding_raised',
      'milestone', 'product_launched', 'achievement',
      'acquisition', 'exit', 'growth',
    ].some((k) => cat.includes(k) || (j.entity_type === 'venture'))
  })

  // ── Stats ─────────────────────────────────────────────────────────
  const stats = {
    total_ventures: enrichedVentures.length,
    active_ventures: enrichedVentures.filter((v: any) => {
      const s = (v.status || '').toLowerCase()
      return s === 'active' || s === 'live' || s === 'launched' || s === 'building' || s === 'scaling'
    }).length,
    total_followers: enrichedVentures.reduce(
      (sum: number, v: any) => sum + (v.follower_count || 0),
      0,
    ),
    total_team_members: Object.values(teamCounts).reduce(
      (sum, c) => sum + c, 0,
    ),
    total_funding_rounds: Object.values(fundingByVenture).reduce(
      (sum, rounds) => sum + rounds.length, 0,
    ),
  }

  return NextResponse.json({
    ventures: enrichedVentures,
    stats,
    journey,
  })
}