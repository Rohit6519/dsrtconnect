'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Show mono uppercase style — Palantir-inspired */
  variant?: 'default' | 'mono'
  className?: string
}

export function SectionHeader({
  title,
  description,
  actions,
  variant = 'default',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-4', className)}>
      <div className="min-w-0">
        {variant === 'mono' ? (
          <p className="label-mono text-white/50">{title}</p>
        ) : (
          <h2 className="text-[15px] font-semibold text-white tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1 text-[13px] text-white/50 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}