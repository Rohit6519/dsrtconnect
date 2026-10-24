import type { Metadata } from 'next'
import { LivingBackground } from '@/components/background/LivingBackground'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reset password — DSRT',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#05070D] text-white flex flex-col relative overflow-hidden">
      <LivingBackground />
      <LandingHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <ResetPasswordForm />
      </main>

      <LandingFooter />
    </div>
  )
}