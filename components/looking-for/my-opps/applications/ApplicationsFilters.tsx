'use client'

import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlass, CaretDown, X } from '@phosphor-icons/react'

export type ApplicationFilters = {
  q: string
  stage: string
  opportunity_id: string
  reviewer: string
  verified: string
  days: string
  skills: string
  sort: string
}

// Stage keys match the DB constraint exactly
const STAGES = [
  { key: 'all',          label: 'All' },
  { key: 'new',          label: 'New' },          // → submitted / applied / pending
  { key: 'reviewing',    label: 'Reviewing' },    // → reviewing
  { key: 'shortlisted',  label: 'Shortlist' },    // → screening
  { key: 'interview',    label: 'Interview' },    // → interviewing
  { key: 'offer',        label: 'Offer' },        // → offered
  { key: 'accepted',     label: 'Selected' },     // → hired
  { key: 'declined',     label: 'Rejected' },     // → rejected
  { key: 'withdrawn',    label: 'Withdrawn' },    // → withdrawn
]

export function ApplicationsFilters({
  value,
  onChange,
  stats,
}: {
  value: ApplicationFilters
  onChange: (v: ApplicationFilters) => void
  stats: any
}) {
  const [q, setQ] = useState(value.q)
  useEffect(() => setQ(value.q), [value.q])
  useEffect(() => {
    const t = setTimeout(() => { if (q !== value.q) onChange({ ...value, q }) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const activeCount =
    (value.opportunity_id ? 1 : 0) +
    (value.reviewer ? 1 : 0) +
    (value.verified ? 1 : 0) +
    (value.days ? 1 : 0) +
    (value.skills ? 1 : 0)

  return (
    // z-40 elevates the whole filter card above the table below
    <div className="relative z-40 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="p-3 md:p-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search applicant name, opportunity, or skill…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <OpportunityPicker
          value={value.opportunity_id}
          onChange={(v) => onChange({ ...value, opportunity_id: v })}
        />

        <Select
          value={value.days || 'any'}
          onChange={(v) => onChange({ ...value, days: v === 'any' ? '' : v })}
          options={[
            { value: 'any', label: 'Any date' },
            { value: '7',   label: 'Last 7 days' },
            { value: '30',  label: 'Last 30 days' },
            { value: '90',  label: 'Last 90 days' },
          ]}
        />

        <Select
          value={value.verified || 'any'}
          onChange={(v) => onChange({ ...value, verified: v === 'any' ? '' : v })}
          options={[
            { value: 'any',   label: 'Any applicant' },
            { value: 'true',  label: 'Verified only' },
            { value: 'false', label: 'Unverified only' },
          ]}
        />

        <Select
          value={value.reviewer || 'any'}
          onChange={(v) => onChange({ ...value, reviewer: v === 'any' ? '' : v })}
          options={[
            { value: 'any',        label: 'Any reviewer' },
            { value: 'unassigned', label: 'Unassigned' },
          ]}
        />

        <SkillsInput
          value={value.skills}
          onChange={(v) => onChange({ ...value, skills: v })}
        />

        {activeCount > 0 && (
          <button
            onClick={() => onChange({ q: value.q, stage: value.stage, opportunity_id: '', reviewer: '', verified: '', days: '', skills: '', sort: value.sort })}
            className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-400 hover:text-white"
          >
            <X size={11} weight="bold" />
            Clear
          </button>
        )}

        <div className="ml-auto">
          <Select
            value={value.sort}
            onChange={(v) => onChange({ ...value, sort: v })}
            options={[
              { value: 'newest',       label: 'Newest' },
              { value: 'oldest',       label: 'Oldest' },
              { value: 'stage_recent', label: 'Recently moved' },
            ]}
          />
        </div>
      </div>

      {/* Stage chips */}
      <div className="border-t border-zinc-800/70 px-2 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {STAGES.map(s => {
          const count = s.key === 'all' ? (stats?.total ?? null) : (stats?.[s.key] ?? null)
          const active = value.stage === s.key
          return (
            <button
              key={s.key}
              onClick={() => onChange({ ...value, stage: s.key })}
              className={
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ' +
                (active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
              }
            >
              {s.label}
              {count !== null && (
                <span className={'text-[10.5px] font-bold ' + (active ? 'text-zinc-400' : 'text-zinc-600')}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Select({
  value, options, onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])
  const current = options.find(o => o.value === value)?.label || options[0]?.label
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white"
      >
        <span>{current}</span>
        <CaretDown size={11} weight="bold" className="text-zinc-500" />
      </button>
      {open && (
        // z-50 puts the dropdown above filter card, table headers, and side panel
        <div className="absolute right-0 top-full mt-1 min-w-[200px] rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-50 py-1">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={
                'w-full text-left px-3 py-2 text-[12.5px] transition-colors ' +
                (o.value === value ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OpportunityPicker({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
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

  const current = value
    ? (opps.find(o => o.id === value)?.title || 'Selected opportunity')
    : 'All opportunities'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white max-w-[240px]"
      >
        <span className="truncate">{current}</span>
        <CaretDown size={11} weight="bold" className="text-zinc-500 shrink-0" />
      </button>
      {open && (
        // z-50 fix
        <div className="absolute right-0 top-full mt-1 w-[320px] max-h-[360px] overflow-y-auto rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-50 py-1">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={'w-full text-left px-3 py-2 text-[12.5px] ' + (!value ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')}
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
                'w-full text-left px-3 py-2 text-[12.5px] transition-colors ' +
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

function SkillsInput({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onChange(local) }}
      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() } }}
      placeholder="Skills (comma separated)"
      className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 w-[200px]"
    />
  )
}