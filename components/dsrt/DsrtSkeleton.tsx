'use client'
import { cn } from '@/lib/utils'

interface DsrtSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'shimmer'
}

/**
 * DSRT Skeleton — base loading placeholder.
 * Uses your existing .shimmer class from globals.css.
 */
export function DsrtSkeleton({ className, variant = 'shimmer', ...props }: DsrtSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        variant === 'shimmer' ? 'shimmer' : 'animate-pulse bg-white/[0.05]',
        className
      )}
      {...props}
    />
  )
}

/* ---------- CARD SKELETON ---------- */
export function DsrtCardSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <DsrtSkeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <DsrtSkeleton className="h-3 w-2/3" />
              <DsrtSkeleton className="h-2 w-1/2" />
            </div>
          </div>
          <div className="space-y-1.5">
            <DsrtSkeleton className="h-2 w-full" />
            <DsrtSkeleton className="h-2 w-4/5" />
          </div>
          <div className="flex gap-1.5">
            <DsrtSkeleton className="h-5 w-12 rounded-full" />
            <DsrtSkeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- ROW SKELETON ---------- */
export function DsrtRowSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3"
        >
          <DsrtSkeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <DsrtSkeleton className="h-2.5 w-1/3" />
            <DsrtSkeleton className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- FEED SKELETON ---------- */
export function DsrtFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <DsrtSkeleton className="w-11 h-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <DsrtSkeleton className="h-3 w-32" />
              <DsrtSkeleton className="h-2 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <DsrtSkeleton className="h-3 w-full" />
            <DsrtSkeleton className="h-3 w-11/12" />
            <DsrtSkeleton className="h-3 w-3/4" />
          </div>
          <DsrtSkeleton className="h-40 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}