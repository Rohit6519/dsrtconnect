// filepath: components/auth/AuthShell.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck } from '@phosphor-icons/react'
import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignupForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { VerifyEmailScreen } from './VerifyEmailScreen'

export type AuthView = 'signin' | 'signup' | 'forgot' | 'verify'

interface Props {
  initialView?: AuthView
  onViewChange?: (view: AuthView) => void
}

export function AuthShell({ initialView = 'signin', onViewChange }: Props) {
  const [view, setView] = useState<AuthView>(initialView)
  const [verifyEmail, setVerifyEmail] = useState('')

  const handleSwitchView = (newView: AuthView) => {
    setView(newView)
    if (onViewChange) onViewChange(newView)
  }

  const handleVerify = (email: string) => {
    setVerifyEmail(email)
    handleSwitchView('verify')
  }

  const renderView = () => {
    switch (view) {
      case 'signin':
        return <SignInForm onSwitchView={handleSwitchView} />
      case 'signup':
        return <SignUpForm onSwitchView={handleSwitchView} onVerify={handleVerify} />
      case 'forgot':
        return <ForgotPasswordForm onSwitchView={handleSwitchView} />
      case 'verify':
        return <VerifyEmailScreen email={verifyEmail} />
      default:
        return null
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mobile Logo (Desktop logo is in layout header) */}
      <div className="lg:hidden flex flex-col items-center mb-8">
        <DsrtLogo size={42} showText={false} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="lg:bg-[#0B0D14]/80 lg:backdrop-blur-xl lg:border lg:border-white/[0.08] lg:shadow-2xl lg:rounded-[24px] lg:p-10 flex flex-col items-center">
          
          {/* Card Top Logo - Desktop Only */}
          <div className="hidden lg:flex justify-center mb-6">
            <DsrtLogo size={36} showText={false} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Security Badge - Below form on Mobile, Below Card on Desktop */}
        <div className="flex items-center justify-center gap-2 mt-8 lg:mt-6 text-white/40">
          <ShieldCheck className="w-[15px] h-[15px]" weight="regular" />
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] font-medium">Secured by Enterprise Encryption</span>
        </div>
      </motion.div>
    </div>
  )
}