'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface RightRailProps {
  children: ReactNode
  className?: string
  /** Sticky top offset (px) — accounts for navbar height. Default: 96. */
  stickyTop?: number
}

/**
 * Sticky right sidebar for detail pages (community, project, event, etc.).
 * Used in a 2-column layout: <main> + <RightRail>
 */
export function RightRail({ children, className, stickyTop = 96 }: RightRailProps) {
  return (
    <aside
      className={cn('hidden lg:block', className)}
      style={{ position: 'sticky', top: stickyTop, alignSelf: 'flex-start' }}
    >
      <div className="space-y-4">{children}</div>
    </aside>
  )
}

/**
 * A single rail card — matches Community Hub aesthetic
 */
export function RailCard({
  title,
  children,
  actions,
  className,
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.06] bg-white/[0.02] p-4',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <p className="label-mono text-white/50">{title}</p>
          )}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}