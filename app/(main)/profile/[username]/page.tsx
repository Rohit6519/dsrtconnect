import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ProfileV3Page } from '@/components/profile-v3/ProfileV3Page'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: { username: string } }) {
  const supabase = await createClient()
  const { data: { user: currentAuthUser } } = await supabase.auth.getUser()

  if (params.username === 'me') {
    if (!currentAuthUser) redirect('/login')
    const { data: myProfile } = await supabase
      .from('users')
      .select('username')
      .eq('id', currentAuthUser.id)
      .single()
    if (myProfile?.username) redirect(`/profile/${myProfile.username}`)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const isOwner = currentAuthUser?.id === profile.id

  const [followersRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_type', 'user').eq('following_id', profile.id),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id).eq('following_type', 'user'),
    currentAuthUser && !isOwner
      ? supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', currentAuthUser.id).eq('following_type', 'user').eq('following_id', profile.id)
      : Promise.resolve({ count: 0 }),
  ])

  return (
    <>
      <CocoPageInjector 
        page="profile" 
        entity={{ type: 'user', id: profile.id }} 
        component={{ registry_id: 'profile.overview' }} 
      />
      <ProfileV3Page
        profile={profile}
        isOwner={isOwner}
        currentUserId={currentAuthUser?.id || null}
        followerCount={followersRes.count || 0}
        followingCount={followingRes.count || 0}
        isFollowing={(isFollowingRes.count || 0) > 0}
      />
    </>
  )
}