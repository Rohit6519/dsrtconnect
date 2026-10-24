import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { ArrowRight, Mail } from 'lucide-react'
import Link from 'next/link'
import { DsrtPanel, DsrtButton, DsrtAvatar } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, username, normalized_username, onboarding_complete, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_complete) {
    redirect('/onboarding')
  }

  const dsrtEmail = `${profile.normalized_username}@dsrtai.com`
  const displayName = profile.full_name?.split(' ')[0] || profile.username

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e3a5f]/20 via-[#05070D] to-[#05070D] opacity-80 pointer-events-none" />

      <header className="relative z-10 border-b border-white/[0.06] px-6 lg:px-12 h-16 sm:h-20 flex items-center bg-[#05070D]/80 backdrop-blur-md">
        <DsrtLogo size={30} showText />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          <DsrtPanel variant="raised" padding="lg" className="text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#2c5282] to-transparent" />

            <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-white leading-tight mb-2 mt-2">
              Your setup is complete.
            </h1>
            <p className="text-[14px] text-white/60 leading-relaxed mb-8">
              Welcome to the network, {displayName}. Your workspace and recommendations are ready.
            </p>

            <div className="bg-[#05070D] border border-white/[0.08] rounded-2xl p-5 mb-8 text-left flex items-center gap-4">
              <DsrtAvatar src={profile.avatar_url} name={profile.full_name} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white truncate">
                  {profile.full_name}
                </p>
                <p className="text-[13px] text-white/50 font-mono mt-0.5 truncate">
                  @{profile.username}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[12px] font-mono text-emerald-300">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{dsrtEmail}</span>
                </div>
              </div>
            </div>

            <DsrtButton asChild variant="white" size="lg" fullWidth>
              <Link href="/home">
                Enter DSRT Connect <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </DsrtButton>
          </DsrtPanel>
        </div>
      </main>
    </div>
  )
}