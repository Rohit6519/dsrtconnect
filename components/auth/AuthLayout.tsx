// filepath: components/auth/AuthLayout.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, Globe, Lightning } from '@phosphor-icons/react'
import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { AuthBackground } from './AuthBackground'
import { AuthShell, type AuthView } from './AuthShell'

export function AuthLayout({ initialView = 'signin' }: { initialView?: AuthView }) {
  const [view, setView] = useState<AuthView>(initialView)

  return (
    <div className="min-h-[100dvh] relative overflow-hidden text-white font-sans">
      {/* Background image + overlays */}
      <AuthBackground />

      {/* Desktop Header */}
      <header className="hidden lg:flex justify-between items-center px-12 py-8 relative z-20 max-w-[1800px] w-full mx-auto">
        <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-3">
          <DsrtLogo size={28} showText={false} />
          <span className="text-[18px] font-medium tracking-tight">DSRT Connect</span>
        </Link>

        <div className="text-[14px] text-white/50 font-medium">
          {view === 'signin' ? (
            <>
              New to DSRT?{' '}
              <button
                onClick={() => setView('signup')}
                className="text-[#4F7CFF] hover:text-[#7B9AFF] transition-colors ml-1"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setView('signin')}
                className="text-[#4F7CFF] hover:text-[#7B9AFF] transition-colors ml-1"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 lg:px-20 xl:px-32 z-10 w-full max-w-[1600px] mx-auto gap-12 lg:gap-24 relative">
        {/* Left Side — Desktop Hero */}
        <div className="hidden lg:flex flex-col max-w-[500px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-[48px] font-bold tracking-tight leading-[1.1] mb-4">
              {view === 'signin' ? 'Welcome back' : 'Join DSRT'}
            </h1>
            <p className="text-[18px] text-white/60">
              {view === 'signin' ? 'Continue where you left off.' : 'Build what matters. Together.'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.8 }}
            className="flex flex-row gap-8 mt-32"
          >
            <Feature
              icon={<ShieldCheck size={20} weight="fill" />}
              title="Secure by design"
              desc="Enterprise-grade encryption to protect your data."
            />
            <Feature
              icon={<Globe size={20} weight="fill" />}
              title="Anywhere access"
              desc="Seamlessly access your work from anywhere."
            />
            <Feature
              icon={<Lightning size={20} weight="fill" />}
              title="Built for performance"
              desc="Fast, reliable, and built to scale with your team."
            />
          </motion.div>
        </div>

        {/* Right Side — Auth Panel */}
        <div className="w-full flex justify-center lg:justify-end mt-10 lg:mt-0">
          <AuthShell initialView={view} onViewChange={setView} />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-[12px] text-white/50 flex flex-col sm:flex-row items-center justify-center sm:gap-6 gap-3 z-10 relative mt-auto">
        <span className="font-medium tracking-wide">© 2026 DSRT. All rights reserved.</span>
        <div className="hidden sm:block h-3 w-px bg-white/20" />
        <div className="flex gap-6 font-medium">
          <Link href="/terms" className="hover:text-white/80 transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-white/80 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-col gap-2 max-w-[140px]">
      <div className="text-[#4F7CFF]">{icon}</div>
      <h3 className="text-[13px] font-semibold text-white/90">{title}</h3>
      <p className="text-[12px] text-white/50 leading-relaxed">{desc}</p>
    </div>
  )
}