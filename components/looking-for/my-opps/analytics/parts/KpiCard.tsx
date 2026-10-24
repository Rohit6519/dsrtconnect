'use client'

import { ArrowRight } from '@phosphor-icons/react'
import Link from 'next/link'

export function KpiCard({
  label, value, sub, href,
}: {
  label: string
  value: string | number
  sub?: string
  href?: string
}) {
  const inner = (
    <div className="rounded-2xl border border-zinc-800/80 p-4 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] transition-colors hover:border-zinc-600/80">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">{label}</div>
      <div className="text-[22px] font-bold text-white tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-[11.5px] text-zinc-500 mt-1">{sub}</div>}
      {href && (
        <div className="mt-2 text-[11px] text-zinc-500 group-hover:text-zinc-300 inline-flex items-center gap-1">
          Open <ArrowRight size={10} weight="bold" />
        </div>
      )}
    </div>
  )
  return href ? <Link href={href} className="group block">{inner}</Link> : inner
}