'use client'

import { MagnifyingGlass, CaretDown, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

export type PortfolioFilterState = {
  q: string
  status: string    // all | draft | active | paused | closed | filled | archived
  type: string      // all | any opportunity_type
  linked: string    // all | project | venture | organization | community | none
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
  { value: 'archived', label: 'Archived' },
]

const LINKED_OPTIONS = [
  { value: 'all', label: 'Any link' },
  { value: 'project', label: 'Linked to project' },
  { value: 'venture', label: 'Linked to venture' },
  { value: 'organization', label: 'Linked to org' },
  { value: 'community', label: 'Linked to community' },
  { value: 'none', label: 'Standalone' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'hire', label: 'Hire' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'project-collaboration', label: 'Project Collaboration' },
  { value: 'team-up', label: 'Team Up' },
  { value: 'cofounder', label: 'Co-founder' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'research', label: 'Research' },
  { value: 'open-source', label: 'Open Source' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'consulting', label: 'Consulting' },
]

export function PortfolioFilters({
  value,
  onChange,
  totalCount,
}: {
  value: PortfolioFilterState
  onChange: (v: PortfolioFilterState) => void
  totalCount: number | null
}) {
  const [q, setQ] = useState(value.q)

  useEffect(() => { setQ(value.q) }, [value.q])

  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== value.q) onChange({ ...value, q })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const activeFilterCount =
    (value.status !== 'all' ? 1 : 0) +
    (value.type !== 'all' ? 1 : 0) +
    (value.linked !== 'all' ? 1 : 0)

  const clearAll = () => onChange({ q: '', status: 'all', type: 'all', linked: 'all' })

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="p-3 md:p-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, description, or OPP-ID…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <Select
          value={value.status}
          options={STATUS_OPTIONS}
          onChange={(v) => onChange({ ...value, status: v })}
        />
        <Select
          value={value.type}
          options={TYPE_OPTIONS}
          onChange={(v) => onChange({ ...value, type: v })}
        />
        <Select
          value={value.linked}
          options={LINKED_OPTIONS}
          onChange={(v) => onChange({ ...value, linked: v })}
        />

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-400 hover:text-white"
          >
            <X size={11} weight="bold" />
            Clear
          </button>
        )}

        <div className="ml-auto text-[12px] text-zinc-500">
          {totalCount === null ? 'Loading…' : `${totalCount.toLocaleString()} result${totalCount === 1 ? '' : 's'}`}
        </div>
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
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) window.addEventListener('click', close)
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
        <div className="absolute right-0 top-full mt-1 min-w-[200px] rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-30 py-1">
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