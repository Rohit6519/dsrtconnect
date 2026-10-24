'use client'

import { CheckCircle, ShieldCheck } from '@phosphor-icons/react'

interface Props {
  variant?: 'compact' | 'default' | 'large'
  className?: string
}

/**
 * Verified Assessment Badge
 * Shown on ventures where has_verified_assessment = true.
 * Fits alongside the existing venture header.
 */
export function AssessmentBadge({ variant = 'default', className = '' }: Props) {
  if (variant === 'compact') {
    return (
      <span
        title="Verified Assessment"
        className={
          'inline-flex items-center gap-1 h-5 px-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300 ' +
          className
        }
      >
        <CheckCircle size={9} weight="fill" /> Verified
      </span>
    )
  }

  if (variant === 'large') {
    return (
      <div
        className={
          'inline-flex items-center gap-2 h-8 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[12px] font-semibold text-emerald-300 ' +
          className
        }
        title="This venture completed the DSRT Venture Assessment"
      >
        <ShieldCheck size={13} weight="fill" />
        Verified Assessment
      </div>
    )
  }

  return (
    <span
      className={
        'inline-flex items-center gap-1.5 h-6 px-2 rounded bg-emerald-500/10 border border-emerald-500/25 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-300 ' +
        className
      }
      title="This venture completed the DSRT Venture Assessment"
    >
      <ShieldCheck size={10} weight="fill" />
      Verified
    </span>
  )
}