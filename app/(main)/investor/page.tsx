import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvestorDashboard } from '@/components/investor/InvestorDashboard'
import { DsrtPage } from '@/components/dsrt'

export default async function InvestorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user!.id)
    .single()

  if (!profile?.is_investor) {
    redirect('/settings?tab=investor')
  }

  const [
    { data: watchlist },
    { data: newVentures },
    { data: trending },
    { data: myFocus },
  ] = await Promise.all([
    supabase
      .from('investor_watchlist')
      .select('*, startups(id, name, slug, tagline, stage, category, logo_url, follower_count, member_count, founder_id, users:founder_id(full_name, username, avatar_url))')
      .eq('investor_id', user!.id),
    supabase
      .from('startups')
      .select('*, users:founder_id(full_name, username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('startups')
      .select('*, users:founder_id(full_name, username, avatar_url)')
      .order('follower_count', { ascending: false })
      .limit(10),
    supabase
      .from('startups')
      .select('*, users:founder_id(full_name, username, avatar_url)')
      .overlaps('category', profile.focus_sectors || [])
      .limit(15),
  ])

  return (
    <DsrtPage width="wide" className="py-6 sm:py-8">
      <InvestorDashboard
        profile={profile}
        watchlist={watchlist || []}
        newVentures={newVentures || []}
        trending={trending || []}
        focusVentures={myFocus || []}
      />
    </DsrtPage>
  )
}