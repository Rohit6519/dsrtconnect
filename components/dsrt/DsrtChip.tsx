'use client'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { X } from 'lucide-react'

// FIXED: extended ButtonHTMLAttributes so onClick, disabled, etc. are permitted natively
export interface DsrtChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLSpanElement> {
  children: ReactNode
  icon?: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
  asButton?: boolean
  active?: boolean
  onRemove?: () => void
}

const toneMap = {
  neutral: 'bg-white/[0.04] text-white/70 border-white/[0.08] hover:bg-white/[0.08]',
  accent: 'bg-[#1e3a5f]/40 text-[#93c5fd] border-[#2c5282]/40 hover:bg-[#1e3a5f]/60',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/15',
  danger: 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/15',
}

const activeMap = {
  neutral: 'bg-white/[0.1] border-white/[0.2] text-white',
  accent: 'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] border-[#2c5282] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
  warning: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
  danger: 'bg-red-500/20 border-red-500/40 text-red-200',
}

export function DsrtChip({
  children,
  icon,
  tone = 'neutral',
  size = 'md',
  onClick,
  onRemove,
  active,
  asButton,
  className,
  ...props
}: DsrtChipProps) {
  const Comp: any = asButton || onClick || onRemove ? 'button' : 'span'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        active ? activeMap[tone] : toneMap[tone],
        (onClick || onRemove || asButton) && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="flex-shrink-0 -mr-0.5 opacity-60 hover:opacity-100"
        >
          <X className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        </span>
      )}
    </Comp>
  )
}