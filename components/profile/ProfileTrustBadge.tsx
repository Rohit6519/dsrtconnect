'use client'

import { ShieldCheck, CheckCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface ProfileTrustBadgeProps {
  trustLevel?: 'NEW' | 'ESTABLISHED' | 'VERIFIED' | 'TRUSTED' | string
  isVerified?: boolean
  className?: string
}

export function ProfileTrustBadge({ trustLevel = 'NEW', isVerified = false, className }: ProfileTrustBadgeProps) {
  if (trustLevel === 'NEW' && !isVerified) return null

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium tracking-tight border", className,
      trustLevel === 'TRUSTED' ? "bg-[#4F7CFF]/10 border-[#4F7CFF]/30 text-[#4F7CFF]" :
      trustLevel === 'VERIFIED' || isVerified ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
      "bg-white/[0.04] border-white/[0.08] text-white/70"
    )}>
      {trustLevel === 'TRUSTED' ? (
        <ShieldCheck className="w-3.5 h-3.5 text-[#4F7CFF]" weight="fill" />
      ) : (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" weight="fill" />
      )}
      <span>{trustLevel === 'TRUSTED' ? 'Trusted Builder' : trustLevel === 'VERIFIED' || isVerified ? 'Verified' : 'Established'}</span>
    </div>
  )
}