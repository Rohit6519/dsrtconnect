import { createClient } from '@/lib/supabase/server'
import { ExploreView } from '@/components/explore/ExploreView'

export default async function ExplorePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: trendingBuilders },
    { data: risingProjects },
    { data: topCommunities },
    { data: myFollows },
  ] = await Promise.all([
    supabase
      .from('leaderboard_builders')
      .select('*')
      .neq('id', user!.id)
      .limit(20),
    supabase
      .from('leaderboard_projects')
      .select('*')
      .limit(12),
    supabase
      .from('leaderboard_communities')
      .select('*')
      .limit(12),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user!.id)
      .eq('following_type', 'user'),
  ])

  const followingIds = new Set(myFollows?.map(f => f.following_id) || [])

  return (
    <ExploreView
      builders={trendingBuilders || []}
      projects={risingProjects || []}
      communities={topCommunities || []}
      followingIds={Array.from(followingIds)}
      currentUserId={user!.id}
    />
  )
}