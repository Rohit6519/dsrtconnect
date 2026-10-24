import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const range = new URL(req.url).searchParams.get('range') || '30d'
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'ytd' ? 365 : 30
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id')
    .eq('poster_user_id', user.id)

  const oppIds = (opps || []).map(o => o.id)
  if (oppIds.length === 0) return NextResponse.json({ series: [] })

  const { data: daily } = await supabase
    .from('opportunity_daily_metrics')
    .select('date, views, applications_submitted, applications_started, qualified_count, selected_count')
    .in('opportunity_id', oppIds)
    .gte('date', since)

  // Roll up by date
  const map = new Map<string, any>()
  for (const d of daily || []) {
    const row = map.get(d.date) || { date: d.date, views: 0, applications: 0, application_starts: 0, qualified: 0, selected: 0 }
    row.views += d.views || 0
    row.applications += d.applications_submitted || 0
    row.application_starts += d.applications_started || 0
    row.qualified += d.qualified_count || 0
    row.selected += d.selected_count || 0
    map.set(d.date, row)
  }

  const series = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  return NextResponse.json({ series })
}