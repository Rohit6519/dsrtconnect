'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { LucideIcon, Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  /** Compact = smaller vertical padding, for inline use */
  variant?: 'default' | 'compact'
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
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
          'flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-4',
          variant === 'default' ? 'w-14 h-14' : 'w-11 h-11'
        )}
      >
        <Icon
          strokeWidth={1.5}
          className={cn(
            'text-white/40',
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
      {description && (
        <p
          className={cn(
            'mt-1.5 text-white/50 max-w-md leading-relaxed',
            variant === 'default' ? 'text-[13px]' : 'text-[12px]'
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}