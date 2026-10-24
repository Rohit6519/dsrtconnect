'use client'
import { cn } from '@/lib/utils'
import React, { forwardRef } from 'react'

// FIXED: Removed strict generic HTMLAttributes that conflict with 'as' polymorphism
// FIXED: Made children optional so it can be used as an empty skeleton/pulse block
export interface DsrtPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  variant?: 'default' | 'raised' | 'inset' | 'accent'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  radius?: 'md' | 'lg' | 'xl' | '2xl'
  as?: React.ElementType
}

const paddingMap = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6 md:p-7',
}

const radiusMap = {
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-[20px]',
}

const variantMap = {
  default: 'bg-white/[0.02] border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
  raised: 'bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] border border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]',
  inset: 'bg-black/30 border border-white/[0.04] shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]',
  accent: 'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] border border-[#2c5282]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_8px_rgba(30,58,95,0.3)]',
}

export const DsrtPanel = forwardRef<HTMLDivElement, DsrtPanelProps>(
  ({ children, className, variant = 'default', padding = 'md', radius = 'xl', as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          variantMap[variant],
          paddingMap[padding],
          radiusMap[radius],
          className
        )}
        {...(props as any)}
      >
        {children}
      </Component>
    )
  }
)
DsrtPanel.displayName = 'DsrtPanel'