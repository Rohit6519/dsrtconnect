import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: posts } = await supabase
    .from('posts')
    .select(
      '*, users(id, full_name, username, avatar_url, tagline, is_bot)'
    )
    .gte('created_at', weekAgo)
    .order('like_count', { ascending: false })
    .limit(10)

  const scored = (posts || [])
    .map((p) => {
      const hoursSince =
        (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
      const recencyBonus = Math.max(0, 48 - hoursSince)
      const score =
        (p.like_count || 0) * 3 +
        (p.comment_count || 0) * 2 +
        (p.view_count || 0) * 0.1 +
        recencyBonus
      return { ...p, trending_score: score }
    })
    .sort((a, b) => b.trending_score - a.trending_score)

  const { data: ventures } = await supabase
    .from('startups')
    .select('id, name, slug, tagline, follower_count, member_count, stage, is_verified, logo_url')
    .gte('created_at', weekAgo)
    .order('follower_count', { ascending: false })
    .limit(5)

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, slug, tagline, member_count, stage')
    .gte('created_at', weekAgo)
    .order('member_count', { ascending: false })
    .limit(5)

  return NextResponse.json({
    posts: scored.slice(0, 10),
    ventures: ventures || [],
    projects: projects || [],
  })
}