import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || '30d'
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 365 : 30

  // Fetch venture + verify owner
  const { data: venture, error: vErr } = await supabase
    .from('ventures')
    .select('id, founder_id, user_id, follower_count, view_count')
    .eq('slug', slug)
    .single()

  if (vErr || !venture) {
    return NextResponse.json({ error: 'Venture not found' }, { status: 404 })
  }

  const isOwner = user.id === venture.founder_id || user.id === venture.user_id
  if (!isOwner) {
    return NextResponse.json({ error: 'Only owner can view analytics' }, { status: 403 })
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const startISO = startDate.toISOString()

  try {
    // ─── 1. Fetch raw view events (source of truth) ───
    const { data: viewEvents } = await supabase
      .from('venture_views')
      .select('viewer_id, session_id, source, created_at, is_owner, dwell_ms')
      .eq('venture_id', venture.id)
      .gte('created_at', startISO)
      .order('created_at', { ascending: true })

    const views = viewEvents || []

    // ─── 2. Compute totals ───
    const totalViews = views.length
    const uniqueViewerIds = new Set<string>()
    const uniqueSessionIds = new Set<string>()
    let ownerViews = 0

    for (const v of views) {
      if (v.is_owner) ownerViews++
      if (v.viewer_id) uniqueViewerIds.add(v.viewer_id)
      if (v.session_id) uniqueSessionIds.add(v.session_id)
    }

    // ─── 3. Bucket by day ───
    const dailyMap = new Map<string, {
      date: string
      totalViews: number
      uniqueViews: number  // unique per-day sessions
      uniqueViewers: number
      ownerViews: number
    }>()

    // Seed all days with 0 so chart is continuous
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      dailyMap.set(key, {
        date: key,
        totalViews: 0,
        uniqueViews: 0,
        uniqueViewers: 0,
        ownerViews: 0,
      })
    }

    // Bucket views into days
    const daySessions = new Map<string, Set<string>>()
    const dayViewers = new Map<string, Set<string>>()

    for (const v of views) {
      const key = new Date(v.created_at).toISOString().slice(0, 10)
      const bucket = dailyMap.get(key)
      if (!bucket) continue

      bucket.totalViews++
      if (v.is_owner) bucket.ownerViews++

      if (!daySessions.has(key)) daySessions.set(key, new Set())
      if (!dayViewers.has(key)) dayViewers.set(key, new Set())

      if (v.session_id) daySessions.get(key)!.add(v.session_id)
      if (v.viewer_id) dayViewers.get(key)!.add(v.viewer_id)
    }

    for (const [key, sessions] of daySessions) {
      const bucket = dailyMap.get(key)
      if (bucket) bucket.uniqueViews = sessions.size
    }
    for (const [key, viewers] of dayViewers) {
      const bucket = dailyMap.get(key)
      if (bucket) bucket.uniqueViewers = viewers.size
    }

    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // ─── 4. Sources breakdown ───
    const sourceCounts: Record<string, number> = {}
    for (const v of views) {
      const src = v.source || 'direct'
      sourceCounts[src] = (sourceCounts[src] || 0) + 1
    }

    // ─── 5. Followers over time ───
    const { data: followerEvents } = await supabase
      .from('venture_follower_events')
      .select('action, created_at')
      .eq('venture_id', venture.id)
      .gte('created_at', startISO)
      .order('created_at', { ascending: true })

    const followersDaily = new Map<string, { follows: number; unfollows: number; net: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      followersDaily.set(key, { follows: 0, unfollows: 0, net: 0 })
    }

    for (const ev of followerEvents || []) {
      const key = new Date(ev.created_at).toISOString().slice(0, 10)
      const bucket = followersDaily.get(key)
      if (!bucket) continue
      if (ev.action === 'follow') { bucket.follows++; bucket.net++ }
      else if (ev.action === 'unfollow') { bucket.unfollows++; bucket.net-- }
    }

    const followersOverTime = Array.from(followersDaily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))

    // Running total for follower_count series
    let runningTotal = (venture.follower_count || 0) - followersOverTime.reduce((s, d) => s + d.net, 0)
    const followerTrend = followersOverTime.map(d => {
      runningTotal += d.net
      return { date: d.date, count: Math.max(0, runningTotal), delta: d.net }
    })

    // ─── 6. Applications over time ───
    const { data: applicationEvents } = await supabase
      .from('venture_role_applications')
      .select('created_at, status')
      .eq('venture_id', venture.id)
      .gte('created_at', startISO)

    const appsDaily = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      appsDaily.set(d.toISOString().slice(0, 10), 0)
    }
    for (const app of applicationEvents || []) {
      const key = new Date(app.created_at).toISOString().slice(0, 10)
      if (appsDaily.has(key)) appsDaily.set(key, (appsDaily.get(key) || 0) + 1)
    }
    const applicationsOverTime = Array.from(appsDaily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // ─── 7. Saves over time ───
    const { data: saveEvents } = await supabase
      .from('venture_saves')
      .select('saved_at')
      .eq('venture_id', venture.id)
      .gte('saved_at', startISO)
      .then(r => r, () => ({ data: [] as any[] }))

    const savesDaily = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      savesDaily.set(d.toISOString().slice(0, 10), 0)
    }
    for (const s of saveEvents || []) {
      const key = new Date((s as any).saved_at || (s as any).created_at).toISOString().slice(0, 10)
      if (savesDaily.has(key)) savesDaily.set(key, (savesDaily.get(key) || 0) + 1)
    }
    const savesOverTime = Array.from(savesDaily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // ─── 8. Conversion rates ───
    const totalApps = (applicationEvents || []).length
    const totalSaves = (saveEvents || []).length
    const totalFollows = (followerEvents || []).filter(e => e.action === 'follow').length

    const applicationRate = totalViews > 0 ? (totalApps / totalViews) * 100 : 0
    const saveRate = totalViews > 0 ? (totalSaves / totalViews) * 100 : 0
    const followRate = totalViews > 0 ? (totalFollows / totalViews) * 100 : 0

    // ─── 9. Avg dwell ───
    const dwellValues = views.filter(v => v.dwell_ms && v.dwell_ms > 0).map(v => v.dwell_ms as number)
    const avgDwellMs = dwellValues.length > 0
      ? Math.round(dwellValues.reduce((s, v) => s + v, 0) / dwellValues.length)
      : 0

    return NextResponse.json({
      range,
      days,

      // Summary
      totals: {
        totalViews,
        uniqueViews: uniqueSessionIds.size,
        uniqueViewers: uniqueViewerIds.size,
        ownerViews,
        followers: venture.follower_count || 0,
        applications: totalApps,
        saves: totalSaves,
        follows: totalFollows,
        avgDwellMs,
      },

      // Rates
      rates: {
        applicationRate: parseFloat(applicationRate.toFixed(2)),
        saveRate: parseFloat(saveRate.toFixed(2)),
        followRate: parseFloat(followRate.toFixed(2)),
      },

      // Time series
      daily,
      followerTrend,
      applicationsOverTime,
      savesOverTime,

      // Breakdowns
      sources: sourceCounts,
    })
  } catch (e: any) {
    console.error('Analytics error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}