'use client'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DsrtStickyBarProps {
  children: ReactNode
  className?: string
  /** Position — top or bottom */
  position?: 'top' | 'bottom'
  /** Only visible on mobile (default) */
  mobileOnly?: boolean
}

/**
 * DSRT Sticky Bar — for mobile action bars (Save, Publish, Apply).
 * Sits at bottom above safe area, with backdrop blur.
 */
export function DsrtStickyBar({
  children,
  className,
  position = 'bottom',
  mobileOnly = true,
}: DsrtStickyBarProps) {
  return (
    <div
      className={cn(
        'sticky z-30 bg-[#05070D]/95 backdrop-blur-md border-white/[0.06]',
        position === 'bottom'
          ? 'bottom-0 border-t pb-[env(safe-area-inset-bottom)]'
          : 'top-0 border-b',
        mobileOnly && 'md:hidden',
        className
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3">{children}</div>
    </div>
  )
}