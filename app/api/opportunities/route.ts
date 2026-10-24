import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserIntelligenceProfile } from '@/lib/algorithm/intelligence-profile'
import { scoreOpportunityForUser, applyOpportunityDiversity } from '@/lib/algorithm/opportunity-matching'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)

  const type = searchParams.get('type')
  const categorySlug = searchParams.get('category')
  const subcategorySlug = searchParams.get('subcategory')
  const experience = searchParams.get('experience')
  const compensationType = searchParams.get('compensation')
  const workMode = searchParams.get('work_mode')
  const location = searchParams.get('location')
  const skillsParam = searchParams.get('skills')
  const timeCommitment = searchParams.get('time_commitment')
  const projectLength = searchParams.get('project_length')
  const minBudget = searchParams.get('min_budget')
  const maxBudget = searchParams.get('max_budget')
  const postAge = searchParams.get('post_age')
  const savedOnly = searchParams.get('saved') === 'true'
  const q = searchParams.get('q')?.trim()
  const sort = searchParams.get('sort') || 'recommended'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    let savedOppIds: string[] = []
    if (savedOnly) {
      if (!user) {
        return NextResponse.json({ opportunities: [], total: 0, limit, offset, hasMore: false })
      }
      const { data: saves } = await supabase
        .from('opportunity_saves')
        .select('opportunity_id')
        .eq('user_id', user.id)

      savedOppIds = (saves || []).map((s: any) => s.opportunity_id)
      if (savedOppIds.length === 0) {
        return NextResponse.json({ opportunities: [], total: 0, limit, offset, hasMore: false })
      }
    }

    let query = supabase
      .from('opportunities')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public')

    if (savedOnly) {
      query = query.in('id', savedOppIds)
    } else {
      query = query.in('status', ['active', 'closing-soon'])
    }

    if (type && type !== 'all') {
      query = query.eq('opportunity_type', type)
    }

    if (categorySlug && categorySlug !== 'all') {
      const { data: cat } = await supabase
        .from('opportunity_categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle()
      if (cat) {
        query = query.or(`primary_category_id.eq.${cat.id},subcategory_id.eq.${cat.id}`)
      }
    }

    if (subcategorySlug) {
      const { data: sub } = await supabase
        .from('opportunity_categories')
        .select('id')
        .eq('slug', subcategorySlug)
        .maybeSingle()
      if (sub) {
        query = query.eq('subcategory_id', sub.id)
      }
    }

    if (experience && experience !== 'any') {
      query = query.eq('experience_level', experience)
    }

    if (compensationType) {
      query = query.eq('compensation_type', compensationType)
    }

    if (workMode && workMode !== 'flexible') {
      query = query.eq('work_mode', workMode)
    }

    if (location) {
      query = query.ilike('location', `%${location}%`)
    }

    if (timeCommitment) {
      query = query.eq('time_commitment', timeCommitment)
    }

    if (projectLength) {
      query = query.eq('project_length', projectLength)
    }

    if (skillsParam) {
      const skills = skillsParam.split(',').filter(Boolean)
      if (skills.length > 0) {
        query = query.overlaps('required_skills', skills)
      }
    }

    if (minBudget) {
      query = query.gte('compensation_min', parseInt(minBudget))
    }

    if (maxBudget) {
      query = query.lte('compensation_max', parseInt(maxBudget))
    }

    if (postAge) {
      const ageDaysMap: Record<string, number> = {
        'today': 1,
        'last-3-days': 3,
        'last-week': 7,
        'last-month': 30,
      }
      const days = ageDaysMap[postAge]
      if (days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('published_at', cutoff)
      }
    }

    if (q && q.length >= 2) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,content_text.ilike.%${q}%`)
    }

    if (sort === 'newest') {
      query = query.order('published_at', { ascending: false, nullsFirst: false })
    } else if (sort === 'recently-updated') {
      query = query.order('last_activity_at', { ascending: false, nullsFirst: false })
    } else if (sort === 'most-active') {
      query = query.order('application_count', { ascending: false })
    } else if (sort === 'ending-soon') {
      query = query.order('application_deadline', { ascending: true, nullsFirst: false })
    } else if (sort === 'highest-budget') {
      query = query.order('compensation_max', { ascending: false, nullsFirst: false })
    } else if (sort === 'lowest-budget') {
      query = query.order('compensation_min', { ascending: true, nullsFirst: false })
    } else {
      query = query.order('published_at', { ascending: false, nullsFirst: false })
    }

    const fetchLimit = (sort === 'recommended' && user) ? 120 : limit
    const { data: opportunities, count, error } = await query.range(offset, offset + fetchLimit - 1)
    if (error) throw error

    let items = opportunities || []

    // 🧠 MULTI-STAGE PERSONALIZATION & DIVERSITY RE-RANKING
    if (sort === 'recommended' && user && items.length > 0) {
      const userProfile = await getUserIntelligenceProfile(supabase, user.id)

      const scoredItems = items.map(opp => ({
        opp,
        matchScore: scoreOpportunityForUser(opp, userProfile),
      }))

      scoredItems.sort((a, b) => b.matchScore - a.matchScore)

      // Apply Anti-Echo-Chamber Diversity Filter
      items = applyOpportunityDiversity(scoredItems, limit)
    } else if (items.length > limit) {
      items = items.slice(0, limit)
    }

    // Hydration (Poster, Project, Venture, Category)
    const posterIds = [...new Set(items.map(i => i.poster_user_id).filter(Boolean))]
    const projectIds = [...new Set(items.map(i => i.project_id).filter(Boolean))]
    const ventureIds = [...new Set(items.map(i => i.venture_id).filter(Boolean))]
    const categoryIds = [...new Set(items.flatMap(i => [i.primary_category_id, i.subcategory_id]).filter(Boolean))]

    const [postersRes, projectsRes, venturesRes, categoriesRes] = await Promise.all([
      posterIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified, tagline').in('id', posterIds) : { data: [] },
      projectIds.length ? supabase.from('projects').select('id, slug, name, tagline, icon, cover_image_url').in('id', projectIds) : { data: [] },
      ventureIds.length ? supabase.from('ventures').select('id, slug, name, tagline, logo_url').in('id', ventureIds) : { data: [] },
      categoryIds.length ? supabase.from('opportunity_categories').select('id, name, slug, icon').in('id', categoryIds) : { data: [] },
    ])

    const posterMap = new Map((postersRes.data || []).map((p: any) => [p.id, p]))
    const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))
    const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))
    const categoryMap = new Map((categoriesRes.data || []).map((c: any) => [c.id, c]))

    let savedSet = new Set<string>()
    let appliedSet = new Set<string>()
    if (user && items.length > 0) {
      const oppIds = items.map(i => i.id)
      const [savesRes, appsRes] = await Promise.all([
        supabase.from('opportunity_saves')
          .select('opportunity_id')
          .eq('user_id', user.id)
          .in('opportunity_id', oppIds),
        supabase.from('opportunity_applications')
          .select('opportunity_id')
          .eq('applicant_id', user.id)
          .in('opportunity_id', oppIds),
      ])
      savedSet = new Set((savesRes.data || []).map((s: any) => s.opportunity_id))
      appliedSet = new Set((appsRes.data || []).map((a: any) => a.opportunity_id))
    }

    const enriched = items.map(item => ({
      ...item,
      poster: posterMap.get(item.poster_user_id) || null,
      project: item.project_id ? projectMap.get(item.project_id) || null : null,
      venture: item.venture_id ? ventureMap.get(item.venture_id) || null : null,
      primary_category: item.primary_category_id ? categoryMap.get(item.primary_category_id) || null : null,
      subcategory: item.subcategory_id ? categoryMap.get(item.subcategory_id) || null : null,
      is_saved: savedSet.has(item.id),
      has_applied: appliedSet.has(item.id),
    }))

    return NextResponse.json({
      opportunities: enriched,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (e: any) {
    console.error('Opportunities list error:', e)
    return NextResponse.json({ error: e?.message, opportunities: [], total: 0 }, { status: 500 })
  }
}