// filepath: components/dsrt/DsrtRightRail.tsx
'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DsrtLayoutProps {
  children: ReactNode
  rail: ReactNode
  className?: string
  /** Rail position */
  railPosition?: 'right' | 'left'
  /** When to show rail — mobile hides it always */
  railBreakpoint?: 'lg' | 'xl'
}

/**
 * DSRT Layout with sidebar rail.
 * Mobile: main content only (rail hidden).
 * Desktop: 2-column layout with sticky rail.
 */
export function DsrtLayoutWithRail({
  children,
  rail,
  className,
  railPosition = 'right',
  railBreakpoint = 'lg',
}: DsrtLayoutProps) {
  // Correctly assign fixed rail widths depending on whether it's left or right
  const gridClass =
    railPosition === 'left'
      ? railBreakpoint === 'lg'
        ? 'lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]'
        : 'xl:grid-cols-[280px_1fr]'
      : railBreakpoint === 'lg'
        ? 'lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]'
        : 'xl:grid-cols-[1fr_320px]'

  const railHideClass =
    railBreakpoint === 'lg' ? 'hidden lg:block' : 'hidden xl:block'

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-5 lg:gap-8',
        gridClass,
        className
      )}
    >
      {railPosition === 'left' ? (
        <>
          <aside className={cn(railHideClass, 'min-w-0')}>
            <div className="sticky top-[80px] space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide pr-1">
              {rail}
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </>
      ) : (
        <>
          <main className="min-w-0">{children}</main>
          <aside className={cn(railHideClass, 'min-w-0')}>
            <div className="sticky top-[80px] space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide pl-1">
              {rail}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}