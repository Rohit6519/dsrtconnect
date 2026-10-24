'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  actions?: ReactNode
  backHref?: string
  /** Optional eyebrow — mono uppercase micro-label above title */
  eyebrow?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  backHref,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1.5 text-[12px] text-white/50">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/70">{crumb.label}</span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-white/30" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      )}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="label-mono mb-2 text-white/40">{eyebrow}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-[14px] text-white/60 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
}