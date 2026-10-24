import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyCommunitiesPage } from '@/components/communities/MyCommunitiesPage'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return <MyCommunitiesPage currentUser={profile} initialTab="following" />
}