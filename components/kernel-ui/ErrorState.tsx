'use client'

import { cn } from '@/lib/utils'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  errorCode?: string
  onRetry?: () => void
  variant?: 'default' | 'compact'
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this section. Please try again.',
  errorCode,
  onRetry,
  variant = 'default',
  className,
}: ErrorStateProps) {
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
          'flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 mb-4',
          variant === 'default' ? 'w-14 h-14' : 'w-11 h-11'
        )}
      >
        <AlertCircle
          strokeWidth={1.5}
          className={cn(
            'text-red-400',
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
      {errorCode && (
        <p className="mt-3 font-mono text-[10px] text-white/30 tracking-wider uppercase">
          error · {errorCode}
        </p>
      )}
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-5 bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Try again
        </Button>
      )}
    </div>
  )
}