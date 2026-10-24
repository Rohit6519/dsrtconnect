'use client'

import { ReactNode } from 'react'

interface Props {
  stepNumber: number
  totalSteps?: number
  title: string
  subtitle?: string
  children?: ReactNode
}

export function StepHeader({ stepNumber, totalSteps = 10, title, subtitle }: Props) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
        Step {stepNumber} of {totalSteps}
      </p>
      <h1 className="text-[26px] font-bold text-white tracking-tight leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[14px] text-zinc-400 mt-2 leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}