import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const ventureId = searchParams.get('ventureId')

  if (!ventureId) {
    return NextResponse.json({ error: 'Missing ventureId' }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: venture } = await supabase
    .from('startups')
    .select('*')
    .eq('id', ventureId)
    .single()

  if (!venture || venture.founder_id !== user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Follower growth (last 30 days)
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: newFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_type', 'startup')
    .eq('following_id', ventureId)
    .gte('created_at', thirtyAgo)

  // Members
  const { count: members } = await supabase
    .from('startup_members')
    .select('*', { count: 'exact', head: true })
    .eq('startup_id', ventureId)
    .eq('status', 'active')

  // Milestones
  const { data: milestones } = await supabase
    .from('startup_milestones')
    .select('status')
    .eq('startup_id', ventureId)

  const achieved = milestones?.filter((m) => m.status === 'achieved').length || 0
  const total = milestones?.length || 0

  return NextResponse.json({
    followers: venture.follower_count || 0,
    new_followers_30d: newFollowers || 0,
    members: members || 0,
    milestones_achieved: achieved,
    milestones_total: total,
    completion_rate: total > 0 ? Math.round((achieved / total) * 100) : 0,
  })
}