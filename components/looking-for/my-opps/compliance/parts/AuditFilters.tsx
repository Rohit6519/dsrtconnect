'use client'

import { MagnifyingGlass, X } from '@phosphor-icons/react'

export interface AuditFilterState {
  category: string
  action: string
  actor_id: string
  q: string
  since: string
  until: string
}

const CATEGORIES = ['', 'application','interview','mail','note','reviewer','rule','offer','opportunity','system','compliance']

export function AuditFilters({ value, onChange }: { value: AuditFilterState; onChange: (v: AuditFilterState) => void }) {
  const update = (k: keyof AuditFilterState, v: string) => onChange({ ...value, [k]: v })
  const clear = () => onChange({ category:'', action:'', actor_id:'', q:'', since:'', until:'' })
  const active = !!(value.category || value.action || value.actor_id || value.q || value.since || value.until)

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-3 flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[220px]">
        <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={value.q} onChange={(e) => update('q', e.target.value)}
          placeholder="Search action, entity, reason…"
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" />
      </div>
      <select value={value.category} onChange={(e) => update('category', e.target.value)}
        className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700">
        {CATEGORIES.map(c => <option key={c} value={c}>{c || 'Any category'}</option>)}
      </select>
      <input value={value.action} onChange={(e) => update('action', e.target.value)}
        placeholder="action e.g. application.stage_screening"
        className="w-[280px] h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700" />
      <input type="datetime-local" value={value.since} onChange={(e) => update('since', e.target.value)}
        className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700" />
      <input type="datetime-local" value={value.until} onChange={(e) => update('until', e.target.value)}
        className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 focus:outline-none focus:border-zinc-700" />
      {active && (
        <button onClick={clear} className="inline-flex items-center gap-1 h-10 px-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12px] text-zinc-400 hover:text-white">
          <X size={11} weight="bold" /> Clear
        </button>
      )}
    </div>
  )
}