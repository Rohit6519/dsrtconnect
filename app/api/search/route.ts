import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function classifyQueryIntent(query: string): { intentType: string; tags: string[] } {
  const lower = query.toLowerCase()
  const tags: string[] = []

  if (/cofounder|co-founder|collaborator|team|looking for|hire/i.test(lower)) {
    tags.push('collaboration')
    return { intentType: 'cofounder', tags }
  }
  const industries = ['ai', 'ml', 'robotics', 'saas', 'fintech', 'climate', 'devtools', 'biotech', 'edtech', 'healthtech']
  for (const ind of industries) {
    if (new RegExp(`\\b${ind}\\b`, 'i').test(lower)) tags.push(ind)
  }
  if (/early|seed|series a|series b|pre-seed/i.test(lower)) {
    const stageMatch = lower.match(/early|seed|series a|series b|pre-seed/i)
    if (stageMatch) tags.push(stageMatch[0])
  }
  return {
    intentType: tags.length > 0 ? 'filtered' : 'general',
    tags: Array.from(new Set(tags)),
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  
  if (!query || query.length < 1) {
    return NextResponse.json({ 
      users: [], projects: [], ventures: [], posts: [], communities: [],
      intent: { type: 'empty', tags: [] }
    })
  }

  const searchTerm = `%${query}%`
  const { intentType, tags } = classifyQueryIntent(query)

  if (user) {
    supabase.from('user_search_history').insert({
      user_id: user.id, query, intent_type: intentType, extracted_tags: tags,
    }).then(() => {}, () => {})
  }

  try {
    const [usersRes, projectsRes, venturesRes, communitiesRes, postsRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, username, avatar_url, tagline, brings, follower_count, is_verified')
        .or(`full_name.ilike.${searchTerm},username.ilike.${searchTerm},tagline.ilike.${searchTerm},bio.ilike.${searchTerm}`)
        .eq('onboarding_complete', true)
        .or('is_bot.is.null,is_bot.eq.false')
        .order('follower_count', { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from('projects')
        .select('id, name, slug, icon, sector, description, follower_count')
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},sector.ilike.${searchTerm}`)
        .order('follower_count', { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from('ventures')
        .select('id, name, slug, logo_url, tagline, is_verified, follower_count')
        .or(`name.ilike.${searchTerm},tagline.ilike.${searchTerm},slug.ilike.${searchTerm}`)
        .eq('status', 'active')
        .order('follower_count', { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from('communities')
        .select('id, name, slug, description, member_count, icon, is_verified')
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .eq('is_public', true)
        .order('member_count', { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from('posts')
        .select('id, title, content_text, content, type, created_at, publisher_type, publisher_id, user_id, tags')
        .or(`title.ilike.${searchTerm},content_text.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .eq('visibility', 'global')
        .or('is_draft.is.null,is_draft.eq.false')
        .order('created_at', { ascending: false })
        .limit(6)
    ])

    let validPosts = postsRes.data || []
    if (validPosts.length > 0) {
      const { data: bots } = await supabase.from('users').select('id').eq('is_bot', true)
      const botIds = new Set((bots || []).map(b => b.id))
      validPosts = validPosts.filter(p => !botIds.has(p.user_id))
    }

    return NextResponse.json({
      intent: { type: intentType, tags },
      users: usersRes.data || [],
      projects: projectsRes.data || [],
      ventures: venturesRes.data || [],
      communities: communitiesRes.data || [],
      posts: validPosts,
    })
  } catch (e: any) {
    return NextResponse.json({ 
      users: [], projects: [], ventures: [], posts: [], communities: [],
      error: e?.message
    }, { status: 500 })
  }
}