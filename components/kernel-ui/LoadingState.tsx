'use client'

import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  variant?: 'default' | 'compact' | 'inline'
  className?: string
}

export function LoadingState({
  label = 'Loading…',
  variant = 'default',
  className,
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-white/40 text-[12px]', className)}>
        <Spinner size={12} />
        <span>{label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' ? 'py-16 px-6' : 'py-10 px-4',
        className
      )}
    >
      <Spinner size={variant === 'default' ? 24 : 20} />
      <p
        className={cn(
          'mt-3 font-mono text-white/40 uppercase tracking-wider',
          variant === 'default' ? 'text-[11px]' : 'text-[10px]'
        )}
      >
        {label}
      </p>
    </div>
  )
}

/**
 * Skeleton card grid — for loading lists of cards
 */
export function SkeletonCards({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded shimmer" />
              <div className="h-2 w-1/2 rounded shimmer" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded shimmer" />
            <div className="h-2 w-4/5 rounded shimmer" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 w-12 rounded-full shimmer" />
            <div className="h-5 w-16 rounded-full shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton row list — for loading tables/lists
 */
export function SkeletonRows({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3"
        >
          <div className="w-9 h-9 rounded-full shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-1/3 rounded shimmer" />
            <div className="h-2 w-1/2 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}