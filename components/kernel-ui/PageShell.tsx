'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  className?: string
  /** Constrain content width. Default: 'default' (1200px). Use 'wide' for full width. */
  width?: 'default' | 'wide' | 'narrow' | 'full'
  /** Vertical padding. Default: 'default'. */
  padding?: 'default' | 'compact' | 'none'
}

const widthClass: Record<NonNullable<PageShellProps['width']>, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-[1400px]',
  full: 'max-w-none',
}

const paddingClass: Record<NonNullable<PageShellProps['padding']>, string> = {
  none: '',
  compact: 'py-4 px-4 md:px-6',
  default: 'py-8 px-4 md:px-8',
}

export function PageShell({
  children,
  className,
  width = 'default',
  padding = 'default',
}: PageShellProps) {
  return (
    <div className="min-h-[calc(100vh-76px)] bg-surface-0 text-white">
      <div className={cn('mx-auto', widthClass[width], paddingClass[padding], className)}>
        {children}
      </div>
    </div>
  )
}