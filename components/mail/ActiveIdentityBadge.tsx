'use client'

import { User, Rocket, Buildings, Stack, CaretDown } from '@phosphor-icons/react'
import { useMailIdentity } from './hooks/useMailIdentity'
import { cn } from '@/lib/utils'

const ENTITY_META = {
  user: { icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  venture: { icon: Buildings, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  project: { icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
}

interface Props {
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function ActiveIdentityBadge({ size = 'md', showLabel = true, className }: Props) {
  const { activeIdentity, isUnified } = useMailIdentity()

  if (!activeIdentity) return null

  const isSmall = size === 'sm'
  const iconSize = isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const avatarSize = isSmall ? 'w-5 h-5' : 'w-6 h-6'
  const textSize = isSmall ? 'text-[10px]' : 'text-[11px]'
  const paddingClass = isSmall ? 'h-6 px-2' : 'h-7 px-2.5'

  if (isUnified) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03]",
        paddingClass,
        className
      )}>
        <div className={cn(
          "rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 flex items-center justify-center flex-shrink-0",
          avatarSize
        )}>
          <Stack className={cn(iconSize, "text-white")} weight="fill" />
        </div>
        {showLabel && (
          <span className={cn(textSize, "font-semibold text-white/80")}>
            Unified
          </span>
        )}
      </div>
    )
  }

  if (typeof activeIdentity !== 'object') return null

  const meta = ENTITY_META[activeIdentity.entity_type]
  const Icon = meta.icon

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-md border",
      meta.border, meta.bg,
      paddingClass,
      className
    )}>
      <div className={cn(
        "rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0",
        avatarSize
      )}>
        {activeIdentity.avatar_url ? (
          <img src={activeIdentity.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon className={cn(iconSize, meta.color)} weight="fill" />
        )}
      </div>
      {showLabel && (
        <span className={cn(textSize, "font-semibold text-white truncate max-w-[140px]")}>
          {activeIdentity.display_name}
        </span>
      )}
    </div>
  )
}