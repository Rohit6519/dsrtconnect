import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })

  const { data: profile } = await supabase.from('users').select('id').eq('username', username).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [followersRes, followingRes, connectionsRes, communitiesRes] = await Promise.all([
    supabase
      .from('follows')
      .select('users:follower_id (id, full_name, username, avatar_url, tagline, brings, location)')
      .eq('following_type', 'user').eq('following_id', profile.id).limit(30),
    supabase
      .from('follows')
      .select('users:following_id (id, full_name, username, avatar_url, tagline, brings, location)')
      .eq('follower_id', profile.id).eq('following_type', 'user').limit(30),
    supabase
      .from('builder_connections')
      .select(`
        requester:requester_id (id, full_name, username, avatar_url, tagline, brings),
        recipient:recipient_id (id, full_name, username, avatar_url, tagline, brings)
      `)
      .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .eq('status', 'accepted').limit(30),
    supabase
      .from('community_members')
      .select('role, communities:community_id (id, name, slug, cover_url, icon, icon_color, member_count, is_verified)')
      .eq('user_id', profile.id).limit(30),
  ])

  const followers = (followersRes.data || []).map((f: any) => f.users).filter(Boolean)
  const following = (followingRes.data || []).map((f: any) => f.users).filter(Boolean)
  const connections = (connectionsRes.data || []).map((c: any) =>
    c.requester?.id === profile.id ? c.recipient : c.requester
  ).filter(Boolean)
  const communities = (communitiesRes.data || []).map((cm: any) => ({ ...cm.communities, role: cm.role })).filter(Boolean)

  return NextResponse.json({
    followers, following, connections, communities,
    counts: {
      followers: followers.length,
      following: following.length,
      connections: connections.length,
      communities: communities.length,
    },
  })
}