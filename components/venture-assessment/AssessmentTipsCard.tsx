'use client'

import { ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
}

export function AssessmentTipsCard({ label, children }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-3">
        {label}
      </p>
      <div className="text-[12px] text-zinc-400 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}