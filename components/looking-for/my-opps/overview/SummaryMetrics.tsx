'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CARDS: { key: string; label: string; href: string }[] = [
  { key: 'active_opportunities', label: 'Active Opportunities', href: '/looking-for/my-opportunities/portfolio?status=active' },
  { key: 'new_applications',     label: 'New Applications',     href: '/looking-for/my-opportunities/applications' },
  { key: 'awaiting_review',      label: 'Awaiting Review',      href: '/looking-for/my-opportunities/applications?stage=submitted' },
  { key: 'active_conversations', label: 'Active Conversations', href: '/looking-for/my-opportunities/messages' },
  { key: 'completed_outcomes',   label: 'Completed Outcomes',   href: '/looking-for/my-opportunities/applications?stage=accepted' },
]

export function SummaryMetrics() {
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch('/api/opportunities/dashboard/summary')
      .then(r => r.ok ? r.json() : { metrics: {} })
      .then(d => setMetrics(d.metrics || {}))
      .catch(() => setMetrics({}))
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {CARDS.map(c => (
        <Link
          key={c.key}
          href={c.href}
          className="group rounded-2xl border border-zinc-800/80 p-4 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] hover:border-zinc-600/80 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)]"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">{c.label}</div>
          <div className="text-[26px] font-bold text-white tracking-tight">
            {metrics ? (metrics[c.key] ?? 0).toLocaleString() : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 group-hover:text-zinc-300">Open →</div>
        </Link>
      ))}
    </div>
  )
}