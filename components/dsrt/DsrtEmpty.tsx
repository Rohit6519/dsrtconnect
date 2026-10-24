'use client'
import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, Inbox } from 'lucide-react'

interface DsrtEmptyProps {
  icon?: LucideIcon | ReactNode
  title: string
  description?: string
  action?: ReactNode
  variant?: 'default' | 'compact'
  className?: string
}

export function DsrtEmpty({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: DsrtEmptyProps) {
  // Safe React Object Child Checker Fix
  const renderIcon = () => {
    if (!icon) {
      return <Inbox strokeWidth={1.5} className={cn('text-white/40', variant === 'default' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-5 h-5')} />
    }
    // If it's already instantiated like <MyIcon />
    if (React.isValidElement(icon)) {
      return icon
    }
    // If it's passed as a component reference (LucideIcon / PhosphorIcon)
    const IconComp = icon as any
    return <IconComp strokeWidth={1.5} className={cn('text-white/40', variant === 'default' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-5 h-5')} />
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' ? 'py-12 sm:py-16 px-4 sm:px-6' : 'py-8 sm:py-10 px-4',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#0a0f1a] border border-white/[0.08] mb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
          variant === 'default' ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-11 h-11 sm:w-12 sm:h-12'
        )}
      >
        {renderIcon()}
      </div>
      <h3
        className={cn(
          'font-semibold text-white tracking-tight',
          variant === 'default' ? 'text-[15px] sm:text-[16px]' : 'text-[13px] sm:text-[14px]'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'mt-1.5 text-white/50 max-w-md leading-relaxed',
            variant === 'default' ? 'text-[12px] sm:text-[13px]' : 'text-[11px] sm:text-[12px]'
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}