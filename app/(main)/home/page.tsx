import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomePageV2 } from '@/components/home-v2/HomePageV2'
import { VerificationBanner } from '@/components/trust/VerificationBanner'
import { DsrtPage } from '@/components/dsrt'
import { CocoPageInjector } from '@/components/coco/CocoPageInjector' // <-- Added

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, tagline, is_verified, account_state')
    .eq('id', user.id)
    .single()

  return (
    <DsrtPage width="wide" padding="none" className="min-h-full">
      {/* COCO Context Registration */}
      <CocoPageInjector 
        page="home" 
        component={{ registry_id: 'home.feed' }} 
      />

      {/* Contextual Adaptive Trust Banner */}
      <div className="w-full px-4 md:px-6 pt-4 pb-2">
        <VerificationBanner />
      </div>
      
      <HomePageV2 currentUser={profile} />
    </DsrtPage>
  )
}