'use client'

import { DsrtLogo } from '@/components/ui/DsrtLogo'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function VentureLoader({ message = 'INITIALIZING...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-5">
      <div className="animate-pulse">
        <DsrtLogo size={52} showText={false} />
      </div>

      {/* Message with subtle pulsing text */}
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] font-bold tracking-widest uppercase text-white/50 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  )
}

// Skeleton loader for sections
export function SectionSkeleton({ height = 'h-32', className }: { height?: string, className?: string }) {
  return (
    <div className={cn(`bg-[#0A0D14] border border-white/[0.06] rounded-2xl p-6 ${height} relative overflow-hidden`, className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full"
        animate={{
          translateX: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
        }}
      />
      <div className="space-y-4 relative opacity-70">
        <div className="h-4 bg-white/10 rounded-md w-1/3" />
        <div className="h-3 bg-white/5 rounded-md w-2/3" />
        <div className="h-3 bg-white/5 rounded-md w-1/2" />
      </div>
    </div>
  )
}

// Live pulse indicator (for real-time features)
export function LivePulse({ label = 'LIVE' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
      <motion.div
        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.4, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}