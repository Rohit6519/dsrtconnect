import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TrendingPage } from '@/components/home-v2/trending/TrendingPage'

export const dynamic = 'force-dynamic'

export default async function Trending() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/trending')

  const { data: profile } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return <TrendingPage currentUser={profile} />
}