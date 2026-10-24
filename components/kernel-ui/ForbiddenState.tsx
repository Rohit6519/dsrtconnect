'use client'

import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ForbiddenStateProps {
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  variant?: 'default' | 'compact'
  className?: string
}

export function ForbiddenState({
  title = 'You do not have access',
  description = 'This area is restricted. If you believe this is a mistake, contact an administrator.',
  actionLabel,
  actionHref,
  variant = 'default',
  className,
}: ForbiddenStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' ? 'py-16 px-6' : 'py-10 px-4',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5 mb-4',
          variant === 'default' ? 'w-14 h-14' : 'w-11 h-11'
        )}
      >
        <Lock
          strokeWidth={1.5}
          className={cn(
            'text-amber-400/80',
            variant === 'default' ? 'w-6 h-6' : 'w-5 h-5'
          )}
        />
      </div>
      <h3
        className={cn(
          'font-semibold text-white',
          variant === 'default' ? 'text-[16px]' : 'text-[14px]'
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'mt-1.5 text-white/50 max-w-md leading-relaxed',
          variant === 'default' ? 'text-[13px]' : 'text-[12px]'
        )}
      >
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-5 bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}