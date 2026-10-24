import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserIntelligenceProfile } from '@/lib/algorithm/intelligence-profile'
import { scoreOpportunityForUser } from '@/lib/algorithm/opportunity-matching'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)

  if (!user) {
    const { data } = await supabase.from('opportunities')
      .select('*')
      .eq('visibility', 'public')
      .in('status', ['active', 'closing-soon'])
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)
    return NextResponse.json({ opportunities: data || [] })
  }

  try {
    const userProfile = await getUserIntelligenceProfile(supabase, user.id)

    // Exclude applied and own opportunities
    const [{ data: applied }, { data: ownOpps }] = await Promise.all([
      supabase.from('opportunity_applications').select('opportunity_id').eq('applicant_id', user.id),
      supabase.from('opportunities').select('id').eq('poster_user_id', user.id),
    ])
    const excludeIds = [
      ...(applied || []).map((a: any) => a.opportunity_id),
      ...(ownOpps || []).map((o: any) => o.id),
    ]

    let candidatesQuery = supabase.from('opportunities')
      .select('*')
      .eq('visibility', 'public')
      .in('status', ['active', 'closing-soon'])
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(150)

    if (excludeIds.length > 0) {
      candidatesQuery = candidatesQuery.not('id', 'in', '(' + excludeIds.join(',') + ')')
    }

    const { data: candidates } = await candidatesQuery
    const items = candidates || []

    // Score with matching engine
    const scored = items.map((opp: any) => ({
      opp,
      matchScore: scoreOpportunityForUser(opp, userProfile),
    }))

    scored.sort((a, b) => b.matchScore - a.matchScore)
    const top = scored.slice(0, limit).map(s => ({
      ...s.opp,
      match_score: s.matchScore,
    }))

    // Enrich
    const posterIds = [...new Set(top.map((i: any) => i.poster_user_id).filter(Boolean))]
    const projectIds = [...new Set(top.map((i: any) => i.project_id).filter(Boolean))]
    const ventureIds = [...new Set(top.map((i: any) => i.venture_id).filter(Boolean))]

    const [postersRes, projectsRes, venturesRes] = await Promise.all([
      posterIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified, tagline').in('id', posterIds) : { data: [] },
      projectIds.length ? supabase.from('projects').select('id, slug, name, icon, cover_image_url').in('id', projectIds) : { data: [] },
      ventureIds.length ? supabase.from('ventures').select('id, slug, name, logo_url').in('id', ventureIds) : { data: [] },
    ])

    const posterMap = new Map((postersRes.data || []).map((p: any) => [p.id, p]))
    const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
    const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))

    const oppIds = top.map((o: any) => o.id)
    const { data: saves } = oppIds.length
      ? await supabase.from('opportunity_saves')
          .select('opportunity_id').eq('user_id', user.id).in('opportunity_id', oppIds)
      : { data: [] }
    const savedSet = new Set((saves || []).map((s: any) => s.opportunity_id))

    const enriched = top.map((item: any) => ({
      ...item,
      poster: posterMap.get(item.poster_user_id) || null,
      project: item.project_id ? projectMap.get(item.project_id) || null : null,
      venture: item.venture_id ? ventureMap.get(item.venture_id) || null : null,
      is_saved: savedSet.has(item.id),
      has_applied: false,
    }))

    return NextResponse.json({ opportunities: enriched })
  } catch (e: any) {
    console.error('Suggested error:', e)
    return NextResponse.json({ opportunities: [], error: e?.message }, { status: 500 })
  }
}