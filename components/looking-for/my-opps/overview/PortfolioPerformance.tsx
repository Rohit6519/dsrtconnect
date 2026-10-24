'use client'

import { useEffect, useState } from 'react'

const METRICS = [
  { key: 'applications', label: 'Applications' },
  { key: 'views', label: 'Views' },
  { key: 'application_starts', label: 'App starts' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'selected', label: 'Selected' },
]

export function PortfolioPerformance() {
  const [range, setRange] = useState('30d')
  const [metric, setMetric] = useState('applications')
  const [series, setSeries] = useState<any[] | null>(null)

  useEffect(() => {
    const handler = (e: any) => setRange(e.detail || '30d')
    window.addEventListener('myopps:range', handler)
    return () => window.removeEventListener('myopps:range', handler)
  }, [])

  useEffect(() => {
    setSeries(null)
    fetch(`/api/opportunities/dashboard/performance?range=${range}`)
      .then(r => r.ok ? r.json() : { series: [] })
      .then(d => setSeries(d.series || []))
      .catch(() => setSeries([]))
  }, [range])

  const max = Math.max(1, ...(series || []).map((s: any) => Number(s[metric] || 0)))

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[13px] font-bold text-white">Portfolio Performance</h2>
          <p className="text-[11.5px] text-zinc-500 mt-0.5">Time-series across all your opportunities.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl border border-zinc-800 bg-zinc-950">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={
                'h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors ' +
                (metric === m.key ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white')
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {series === null ? (
          <div className="h-40 rounded-lg bg-zinc-900/40 animate-pulse" />
        ) : series.length === 0 ? (
          <p className="py-10 text-center text-[12.5px] text-zinc-500">No data in this range yet.</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {series.map((s: any) => {
              const v = Number(s[metric] || 0)
              const h = Math.max(4, (v / max) * 100)
              return (
                <div
                  key={s.date}
                  className="flex-1 rounded-t bg-gradient-to-t from-zinc-700 to-zinc-300"
                  style={{ height: `${h}%` }}
                  title={`${s.date} · ${v}`}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}