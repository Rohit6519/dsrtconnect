import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsernameSelector } from '@/components/auth/UsernameSelector'
import { LivingBackground } from '@/components/background/LivingBackground'

export const dynamic = 'force-dynamic'

export default async function UsernameClaimPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, username, normalized_username')
    .eq('id', user.id)
    .single()

  // Already has real username → skip
  if (profile?.normalized_username && !profile.normalized_username.startsWith('pending_')) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col relative overflow-hidden">
      <LivingBackground />
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <UsernameSelector 
          initialFullName={profile?.full_name || user.user_metadata?.full_name} 
          initialEmail={profile?.email || user.email}
        />
      </main>
    </div>
  )
}