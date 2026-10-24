'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Severity = 'good' | 'info' | 'warn' | 'bad'

const SEV: Record<Severity, string> = {
  good: 'border-emerald-500/25 bg-emerald-500/[0.06]',
  info: 'border-blue-500/25 bg-blue-500/[0.05]',
  warn: 'border-amber-500/25 bg-amber-500/[0.05]',
  bad:  'border-red-500/25 bg-red-500/[0.05]',
}

const DOT: Record<Severity, string> = {
  good: 'bg-emerald-400',
  info: 'bg-blue-400',
  warn: 'bg-amber-400',
  bad:  'bg-red-400',
}

export function AttentionRequired() {
  const [items, setItems] = useState<any[] | null>(null)

  useEffect(() => {
    fetch('/api/opportunities/dashboard/attention')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
  }, [])

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80">
        <h2 className="text-[13px] font-bold text-white">Attention Required</h2>
        <p className="text-[11.5px] text-zinc-500 mt-0.5">Items that need your action.</p>
      </div>

      {items === null ? (
        <div className="p-6 space-y-2">
          {[0,1,2].map(i => <div key={i} className="h-14 rounded-lg bg-zinc-900/40 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-zinc-500">Nothing needs your attention right now.</div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {items.map((it: any) => {
            const sev = (it.severity || 'info') as Severity
            return (
              <li key={it.key} className={'flex items-start gap-3 px-5 py-3.5 ' + SEV[sev]}>
                <span className={'w-2 h-2 rounded-full mt-1.5 shrink-0 ' + DOT[sev]} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-zinc-100 font-semibold">{it.title}</div>
                  {it.subtitle && <div className="text-[11.5px] text-zinc-500 mt-0.5">{it.subtitle}</div>}
                </div>
                {it.action && (
                  <Link
                    href={it.action.href}
                    className="shrink-0 inline-flex items-center h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-300 hover:text-white transition-colors bg-zinc-950/50"
                  >
                    {it.action.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}