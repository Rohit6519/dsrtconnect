'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretDown, DownloadSimple } from '@phosphor-icons/react'

const RANGES = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'lifetime', label: 'Lifetime' },
]

export function AnalyticsToolbar({
  range, onRangeChange,
  opportunityId, onOpportunityChange,
  exportUrl,
}: {
  range: string
  onRangeChange: (v: string) => void
  opportunityId: string
  onOpportunityChange: (v: string) => void
  exportUrl: string
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-3 md:p-4 flex items-center gap-2 flex-wrap shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)]">
      <OpportunityPicker value={opportunityId} onChange={onOpportunityChange} />
      <RangePicker value={range} onChange={onRangeChange} />
      <div className="ml-auto">
        <a
          href={exportUrl}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-300 hover:text-white bg-zinc-950"
        >
          <DownloadSimple size={13} weight="bold" />
          Export CSV
        </a>
      </div>
    </div>
  )
}

function RangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  const cur = RANGES.find(r => r.key === value)?.label || 'Last 30 days'
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white"
      >
        <span>{cur}</span>
        <CaretDown size={11} weight="bold" className="text-zinc-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[200px] rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-30 py-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => { onChange(r.key); setOpen(false) }}
              className={
                'w-full text-left px-3 py-2 text-[12.5px] transition-colors ' +
                (value === r.key ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OpportunityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [opps, setOpps] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/opportunities/my-opportunities?filter=all')
      .then(r => r.ok ? r.json() : { opportunities: [] })
      .then(d => { setOpps(d.opportunities || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [open, loaded])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const label = value
    ? (opps.find(o => o.id === value)?.title || 'Selected opportunity')
    : 'All opportunities'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white max-w-[300px]"
      >
        <span className="truncate">{label}</span>
        <CaretDown size={11} weight="bold" className="text-zinc-500 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[340px] max-h-[360px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-30 py-1">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={'w-full text-left px-3 py-2 text-[12.5px] ' + (!value ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-300 hover:text-white hover:bg-zinc-900')}
          >
            All opportunities
          </button>
          {opps.length === 0 && loaded && (
            <div className="px-3 py-2 text-[12px] text-zinc-500">No opportunities.</div>
          )}
          {opps.map(o => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false) }}
              className={
                'w-full text-left px-3 py-2 text-[12.5px] ' +
                (value === o.id ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-300 hover:text-white hover:bg-zinc-900')
              }
              title={o.title}
            >
              <div className="truncate">{o.title}</div>
              <div className="text-[10.5px] text-zinc-500 font-mono">{o.opportunity_number || o.id.slice(0, 8)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}