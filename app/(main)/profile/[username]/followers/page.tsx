import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { UserList } from '@/components/follow/UserList'

interface PageProps {
  params: Promise<{ username: string }>
}

export default async function FollowersPage({ params }: PageProps) {
  const { username } = await params
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, username')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: followers } = await supabase
    .from('follows')
    .select(`
      follower_id,
      created_at,
      users:follower_id (
        id, full_name, username, avatar_url, tagline, brings, follower_count
      )
    `)
    .eq('following_type', 'user')
    .eq('following_id', profile.id)
    .order('created_at', { ascending: false })

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Get who current user follows to show follow state
  const { data: myFollows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUser!.id)
    .eq('following_type', 'user')

  const myFollowSet = new Set(myFollows?.map(f => f.following_id) || [])

  const users = (followers || []).map((f: any) => ({
    ...f.users,
    is_following: myFollowSet.has(f.users?.id),
  })).filter(u => u.id)

  return (
    <UserList 
      title={`${profile.full_name}'s Followers`}
      users={users}
      currentUserId={currentUser!.id}
      emptyMessage="No followers yet"
    />
  )
}