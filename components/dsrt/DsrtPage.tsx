'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DsrtPageProps {
  children: ReactNode
  className?: string
  /** Page width — mobile-first responsive */
  width?: 'narrow' | 'default' | 'wide' | 'full'
  /** Padding preset */
  padding?: 'none' | 'compact' | 'default' | 'loose'
  /** Enable safe-area bottom for mobile devices with home bar */
  safeBottom?: boolean
}

const widthMap = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-[1400px]',
  full: 'max-w-none',
}

const paddingMap = {
  /**
   * SAFETY-NET FOR padding="none":
   * On mobile (under `sm`: 640px), we enforce `px-3` so content never bleeds
   * flush against device glass or rounded screen corners.
   * On `sm` and above, padding returns to `px-0 py-0` so desktop full-width
   * designs remain completely unconstrained.
   */
  none: 'px-3 sm:px-0',
  compact: 'px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6',
  default: 'px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8',
  loose: 'px-3 py-6 sm:px-4 sm:py-8 md:px-8 md:py-10 lg:px-10 lg:py-12',
}

/**
 * DSRT Page — mobile-first responsive page container.
 * Enforces safe viewport insets across all presets and protects against
 * edge-clipping on notched or curved mobile screens.
 */
export function DsrtPage({
  children,
  className,
  width = 'default',
  padding = 'default',
  safeBottom = true,
}: DsrtPageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full',
        widthMap[width],
        paddingMap[padding],
        // iOS Notch / Safe-Area Inset Support
        'pl-[max(0.75rem,env(safe-area-inset-left))]',
        'pr-[max(0.75rem,env(safe-area-inset-right))]',
        safeBottom && 'pb-[max(1rem,env(safe-area-inset-bottom))]',
        className
      )}
    >
      {children}
    </div>
  )
}