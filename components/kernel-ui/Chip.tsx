'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface ChipProps {
  children: ReactNode
  icon?: LucideIcon
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  className?: string
  onClick?: () => void
  asButton?: boolean
}

const toneClass: Record<NonNullable<ChipProps['tone']>, string> = {
  neutral:
    'bg-white/[0.05] text-white/70 border-white/[0.08] hover:bg-white/[0.08]',
  accent:
    'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/15',
  success:
    'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15',
  warning:
    'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/15',
  danger:
    'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/15',
  info:
    'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/15',
}

export function Chip({
  children,
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  className,
  onClick,
  asButton,
}: ChipProps) {
  const Comp = asButton || onClick ? 'button' : 'span'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        toneClass[tone],
        (asButton || onClick) && 'cursor-pointer',
        className
      )}
    >
      {Icon && (
        <Icon
          className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          strokeWidth={1.75}
        />
      )}
      {children}
    </Comp>
  )
}