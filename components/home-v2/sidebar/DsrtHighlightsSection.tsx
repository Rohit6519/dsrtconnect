'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkle, ArrowUpRight } from '@phosphor-icons/react'

export function DsrtHighlightsSection() {
  const [highlights, setHighlights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/home/highlights')
      .then(r => r.json())
      .then(d => setHighlights(d.highlights || []))
      .catch(() => setHighlights([]))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && highlights.length === 0) return null

  return (
    <div className={
      'rounded-xl border border-zinc-800/60 overflow-hidden ' +
      'bg-gradient-to-br from-zinc-900/60 via-zinc-950/40 to-zinc-950/40 ' +
      'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.3)]'
    }>
      <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-1.5">
        <Sparkle size={12} weight="fill" className="text-zinc-400" />
        <h3 className="text-[13px] font-bold text-white tracking-tight">DSRT Highlights</h3>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-10 bg-zinc-900/40 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/40">
          {highlights.map(h => (
            <Link
              key={h.label}
              href={h.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/40 transition-colors group"
            >
              <div className="text-[20px] font-bold text-white tabular-nums w-11 shrink-0 tracking-tight">
                {h.value.toLocaleString()}
              </div>
              <div className="flex-1 min-w-0 text-[12px] text-zinc-400 leading-snug">
                {h.label}
              </div>
              <ArrowUpRight
                size={12}
                weight="bold"
                className="text-zinc-600 group-hover:text-white shrink-0 transition-colors"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}