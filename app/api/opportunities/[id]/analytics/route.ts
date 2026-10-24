import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const range = new URL(req.url).searchParams.get('range') || '30d'
  const days = range === '24h' ? 1 : range === '7d' ? 7 : range === 'lifetime' ? 3650 : 30
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const { data: opp } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (opp.poster_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    dailyRes,
    sourceRes,
    appsRes,
    healthRes,
    matchRes,
  ] = await Promise.all([
    supabase
      .from('opportunity_daily_metrics')
      .select('*')
      .eq('opportunity_id', id)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('opportunity_source_metrics')
      .select('*')
      .eq('opportunity_id', id)
      .gte('date', since),
    supabase
      .from('opportunity_applications')
      .select('id, pipeline_stage, status, created_at, applicant_id')
      .eq('opportunity_id', id),
    supabase
      .from('opportunity_health_snapshot')
      .select('*')
      .eq('opportunity_id', id)
      .maybeSingle(),
    supabase
      .from('opportunity_application_matches')
      .select('overall_match_score')
      .eq('opportunity_id', id),
  ])

  const apps = appsRes.data || []
  const daily = dailyRes.data || []
  const sources = sourceRes.data || []
  const matches = matchRes.data || []

  const stageCount = (stages: string[]) =>
    apps.filter(a => stages.includes(a.pipeline_stage)).length

  const funnel = {
    views: opp.view_count || 0,
    unique_visitors: opp.unique_view_count || 0,
    interested: (opp.save_count || 0) + stageCount(['applied', 'submitted', 'pending', 'reviewing', 'screening', 'interviewing', 'offered', 'hired']),
    application_starts: daily.reduce((s, d) => s + (d.applications_started || 0), 0) || apps.length,
    applications: apps.filter(a => a.pipeline_stage !== 'withdrawn' && a.pipeline_stage !== 'draft').length,
    qualified:   stageCount(['reviewing', 'screening', 'interviewing', 'offered', 'hired']),
    shortlisted: stageCount(['screening', 'interviewing', 'offered', 'hired']),
    interviewed: stageCount(['interviewing', 'offered', 'hired']),
    selected:    stageCount(['hired']),
  }

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10000) / 100 : 0)

  const conversions = {
    view_to_application: pct(funnel.applications, funnel.views),
    application_to_qualified: pct(funnel.qualified, funnel.applications),
    qualified_to_shortlisted: pct(funnel.shortlisted, funnel.qualified),
    shortlisted_to_interview: pct(funnel.interviewed, funnel.shortlisted),
    interview_to_selected: pct(funnel.selected, funnel.interviewed),
  }

  // Aggregate sources
  const sourceMap = new Map<string, { views: number; applications: number }>()
  for (const s of sources) {
    const cur = sourceMap.get(s.source) || { views: 0, applications: 0 }
    cur.views += s.views || 0
    cur.applications += s.applications || 0
    sourceMap.set(s.source, cur)
  }
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.views - a.views)

  const avgMatch =
    matches.length > 0
      ? Math.round(
          (matches.reduce((s, m) => s + Number(m.overall_match_score || 0), 0) / matches.length) * 10
        ) / 10
      : Number(opp.match_quality_avg || 0)

  // Health (compute live if missing)
  const health = healthRes.data || computeHealth(opp, funnel, conversions, avgMatch)

  return NextResponse.json({
    opportunity: {
      id: opp.id,
      title: opp.title,
      status: opp.status,
      opportunity_number: opp.opportunity_number,
      slug: opp.slug,
      view_count: opp.view_count,
      unique_view_count: opp.unique_view_count,
      application_count: opp.application_count,
      save_count: opp.save_count,
      share_count: opp.share_count,
      conversion_rate: opp.conversion_rate,
      match_quality_avg: avgMatch,
      published_at: opp.published_at,
      application_deadline: opp.application_deadline,
      last_activity_at: opp.last_activity_at,
    },
    kpis: {
      total_views: funnel.views,
      unique_visitors: funnel.unique_visitors,
      applications: funnel.applications,
      qualified: funnel.qualified,
      shortlisted: funnel.shortlisted,
      interviewed: funnel.interviewed,
      selected: funnel.selected,
      saves: opp.save_count || 0,
      shares: opp.share_count || 0,
      application_conversion: conversions.view_to_application,
      qualification_rate: conversions.application_to_qualified,
      selection_rate: pct(funnel.selected, funnel.applications),
      avg_match_quality: avgMatch,
    },
    funnel,
    conversions,
    daily,
    sources: sourceBreakdown,
    health,
  })
}

function computeHealth(opp: any, funnel: any, conversions: any, avgMatch: number) {
  const insights: { type: 'good' | 'warn' | 'bad'; text: string }[] = []

  const visibility = Math.min(100, Math.round((funnel.views / 50) * 20 + (opp.is_featured ? 20 : 0) + (opp.visibility === 'public' ? 20 : 0)))
  const engagement = Math.min(100, Math.round(((opp.save_count || 0) + (opp.share_count || 0) * 2) * 3 + Math.min(funnel.views, 100) * 0.2))
  const conversion = Math.min(100, Math.round(conversions.view_to_application * 12))
  const quality = Math.min(100, Math.round(avgMatch || conversions.application_to_qualified))
  const clarity =
    (opp.title ? 15 : 0) +
    (opp.description || opp.content_text ? 20 : 0) +
    ((opp.required_skills || []).length > 0 ? 20 : 0) +
    (opp.compensation_type && opp.compensation_type !== 'unpaid' || opp.compensation_min ? 15 : 0) +
    (opp.time_commitment ? 15 : 0) +
    (opp.work_mode ? 15 : 0)
  const freshness = opp.published_at
    ? Math.max(0, 100 - Math.floor((Date.now() - new Date(opp.published_at).getTime()) / 86400000) * 3)
    : 40
  const response = Math.min(100, 50 + (funnel.shortlisted + funnel.interviewed + funnel.selected) * 5)

  if ((opp.required_skills || []).length === 0) {
    insights.push({ type: 'bad', text: 'Required skills are missing — this hurts matching quality.' })
  }
  if (!opp.compensation_min && opp.compensation_type === 'unpaid') {
    insights.push({ type: 'warn', text: 'Compensation details are thin — conversion may suffer.' })
  }
  if (funnel.views > 100 && conversions.view_to_application < 2) {
    insights.push({ type: 'warn', text: 'High visibility but low application conversion.' })
  }
  if (avgMatch >= 75) {
    insights.push({ type: 'good', text: 'Applicant quality is strong.' })
  }
  if (funnel.views >= 200) {
    insights.push({ type: 'good', text: 'Good visibility for this opportunity.' })
  }

  const overall = Math.round(
    visibility * 0.15 +
    engagement * 0.15 +
    conversion * 0.2 +
    quality * 0.2 +
    clarity * 0.15 +
    freshness * 0.1 +
    response * 0.05
  )

  return {
    overall_score: overall,
    visibility_score: visibility,
    engagement_score: engagement,
    conversion_score: conversion,
    quality_score: quality,
    clarity_score: clarity,
    matching_score: Math.round(avgMatch || quality),
    response_score: response,
    freshness_score: freshness,
    insights,
    computed_at: new Date().toISOString(),
  }
}