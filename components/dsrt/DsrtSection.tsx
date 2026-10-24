'use client'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface DsrtSectionProps {
  children?: ReactNode // <-- FIXED: Made optional so it can be used as a header-only component
  className?: string
  title?: string
  description?: string
  actions?: ReactNode
  headerVariant?: 'default' | 'mono' | 'large'
  spacing?: 'sm' | 'md' | 'lg'
}

const spacingMap = {
  sm: 'space-y-3',
  md: 'space-y-4',
  lg: 'space-y-6',
}

export function DsrtSection({
  children,
  className,
  title,
  description,
  actions,
  headerVariant = 'default',
  spacing = 'md',
}: DsrtSectionProps) {
  const hasHeader = title || actions

  return (
    <section className={cn(children ? spacingMap[spacing] : '', className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              headerVariant === 'mono' ? (
                <p className="label-mono text-white/50">{title}</p>
              ) : headerVariant === 'large' ? (
                <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                  {title}
                </h2>
              ) : (
                <h2 className="text-[15px] sm:text-base font-semibold text-white tracking-tight">
                  {title}
                </h2>
              )
            )}
            {description && (
              <p className="mt-1 text-[12px] sm:text-[13px] text-white/50 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}