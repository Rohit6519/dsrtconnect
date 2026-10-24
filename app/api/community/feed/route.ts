import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { scorePost, type UserContext } from '@/lib/algorithm/scoring'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'for_you'
  const category = searchParams.get('category') || ''
  const skill = searchParams.get('skill') || ''
  const goal = searchParams.get('goal') || ''
  const location = searchParams.get('location') || ''
  const community = searchParams.get('community') || ''
  const sortBy = searchParams.get('sort') || 'relevance'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')

  const [
    { data: profile },
    { data: userSkillsRaw },
    { data: followingRaw },
    { data: communitiesRaw },
    { data: userProjects },
    { data: userVentures },
    { data: affinityRaw },
    { data: signalsRaw },
  ] = await Promise.all([
    supabase.from('users').select('interest_topics, brings, seeking, location, tagline').eq('id', user.id).single(),
    supabase.from('user_skills').select('skills(name, category)').eq('user_id', user.id),
    supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_type', 'user'),
    supabase.from('community_members').select('community_id').eq('user_id', user.id),
    supabase.from('projects').select('sector, category').eq('user_id', user.id).limit(20),
    supabase.from('ventures').select('sector, industry').eq('founder_id', user.id).limit(20),
    supabase.from('user_topic_affinity').select('topic, score').eq('user_id', user.id).order('score', { ascending: false }).limit(50),
    supabase.from('user_activity_signals').select('signal_type, entity_type, entity_id, weight').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
  ])

  const userSkills = (userSkillsRaw || []).map((s: any) => s.skills?.name).filter(Boolean)
  const userSkillCategories = Array.from(new Set((userSkillsRaw || []).map((s: any) => s.skills?.category).filter(Boolean))) as string[]
  const followingIds = (followingRaw || []).map(f => f.following_id)
  const communityIds = (communitiesRaw || []).map(c => c.community_id)
  const projectSectors = Array.from(new Set([
    ...(userProjects || []).map((p: any) => p.sector).filter(Boolean),
    ...(userProjects || []).map((p: any) => p.category).filter(Boolean),
  ])) as string[]
  const ventureSectors = Array.from(new Set([
    ...(userVentures || []).map((v: any) => v.sector).filter(Boolean),
    ...(userVentures || []).map((v: any) => v.industry).filter(Boolean),
  ])) as string[]

  // Build topic affinity map (adaptive personalization)
  const affinityMap: Record<string, number> = {}
  ;(affinityRaw || []).forEach((a: any) => {
    affinityMap[a.topic.toLowerCase()] = a.score
  })

  const ctx: UserContext = {
    id: user.id,
    interest_topics: profile?.interest_topics || [],
    brings: profile?.brings || [],
    seeking: profile?.seeking || [],
    location: profile?.location,
    tagline: profile?.tagline,
    skills: userSkills,
    skill_categories: userSkillCategories,
    following_ids: followingIds,
    community_ids: communityIds,
    project_sectors: projectSectors,
    venture_sectors: ventureSectors,
    activity_signals: signalsRaw || [],
  }

  let query = supabase
    .from('posts')
    .select(`
      id, user_id, content, title, type, post_category, sector, skills, goals, tags,
      location, community_id, like_count, comment_count, bookmark_count, view_count,
      created_at, media_urls, media_types,
      event_date, event_location, is_online, registration_url,
      users:user_id (id, full_name, username, avatar_url, tagline, brings, location),
      communities:community_id (id, name, slug)
    `)
    .eq('visibility', 'global')

  if (tab === 'projects') query = query.eq('post_category', 'project')
  else if (tab === 'ventures') query = query.eq('post_category', 'venture')
  else if (tab === 'looking_for') query = query.eq('post_category', 'looking_for')
  else if (tab === 'posts') query = query.eq('post_category', 'post')
  else if (tab === 'events') query = query.in('post_category', ['event', 'hackathon'])
  else if (tab === 'discussions') query = query.in('post_category', ['discussion', 'post'])
  else if (tab === 'opportunities') query = query.in('post_category', ['opportunity', 'looking_for', 'hackathon'])

  if (category) query = query.or(`sector.eq.${category},tags.cs.{${category}}`)
  if (skill) query = query.or(`skills.cs.{${skill}},tags.cs.{${skill}}`)
  if (goal) query = query.contains('goals', [goal])
  if (location) query = query.ilike('location', `%${location}%`)
  if (community) query = query.eq('community_id', community)

  const fetchLimit = (tab === 'for_you' || tab === 'all') && sortBy === 'relevance' ? 120 : limit
  query = query.order('created_at', { ascending: false }).range(offset, offset + fetchLimit - 1)

  const { data: posts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const postIds = (posts || []).map(p => p.id)
  const [{ data: likes }, { data: bookmarks }] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
    supabase.from('post_bookmarks').select('post_id').eq('user_id', user.id).in('post_id', postIds),
  ])
  const likedSet = new Set((likes || []).map(l => l.post_id))
  const bookmarkedSet = new Set((bookmarks || []).map(b => b.post_id))

  let scored = (posts || []).map(p => {
    const { score, reasons } = scorePost(p as any, ctx)

    // Boost by learned affinity (YouTube/IG style adaptive learning)
    let affinityBoost = 0
    const allTerms = [
      ...(p.tags || []),
      ...(p.skills || []),
      p.sector,
    ].filter(Boolean).map((t: string) => t.toLowerCase())

    for (const term of allTerms) {
      if (affinityMap[term]) {
        affinityBoost += affinityMap[term] * 2
      }
    }

    const finalScore = score + Math.min(affinityBoost, 40)

    return {
      ...p,
      is_liked: likedSet.has(p.id),
      is_bookmarked: bookmarkedSet.has(p.id),
      relevance_score: finalScore,
      base_score: score,
      affinity_boost: affinityBoost,
      match_reasons: reasons,
    }
  })

  if (sortBy === 'relevance' && (tab === 'for_you' || tab === 'all')) {
    scored.sort((a, b) => b.relevance_score - a.relevance_score)
  } else if (sortBy === 'popular') {
    scored.sort((a, b) => ((b.like_count || 0) + (b.comment_count || 0) * 2) - ((a.like_count || 0) + (a.comment_count || 0) * 2))
  }

  scored = scored.slice(0, limit)

  return NextResponse.json({
    posts: scored,
    has_more: (posts?.length || 0) >= fetchLimit,
  })
}