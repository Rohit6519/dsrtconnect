'use client'

import { ReactNode, useState } from 'react'
import { ShieldWarning } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DsrtButton } from '@/components/dsrt'

interface TrustGuardProps {
  children: ReactNode
  actionName: string
  trustScore: number
  isVerified: boolean
  minScore?: number
  requireVerification?: boolean
  className?: string
}

export function TrustGuard({ 
  children, actionName, trustScore, isVerified, 
  minScore = 30, requireVerification = false, className 
}: TrustGuardProps) {
  const router = useRouter()
  const [showPrompt, setShowPrompt] = useState(false)

  const meetsScore = trustScore >= minScore
  const meetsVerif = requireVerification ? isVerified : true
  const isAllowed = meetsScore && meetsVerif

  if (isAllowed) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <div 
        onClickCapture={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowPrompt(true)
        }}
        className="cursor-not-allowed opacity-80"
      >
        <div className="pointer-events-none">{children}</div>
      </div>

      {showPrompt && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] p-4 rounded-xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] border border-white/[0.1] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <ShieldWarning className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" weight="fill" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white mb-1">Action Restricted</p>
              <p className="text-[12px] text-white/60 leading-relaxed mb-3">
                To {actionName.toLowerCase()}, you need to build more trust on DSRT. 
                {!meetsVerif && !isVerified && ' Verifying your email is the fastest way to unlock this.'}
              </p>
              
              <div className="flex gap-2 flex-wrap">
                {!isVerified && (
                  <DsrtButton size="xs" variant="primary" onClick={() => router.push('/settings/security')}>
                    Verify Email
                  </DsrtButton>
                )}
                <DsrtButton size="xs" variant="ghost" onClick={() => setShowPrompt(false)}>
                  Cancel
                </DsrtButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}