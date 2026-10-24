'use client'

import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { UniversalSearchDropdown } from './UniversalSearchDropdown'

interface Props {
  q: string
  onQueryChange: (q: string) => void
  onOpenFilters: () => void
  activeFilterCount?: number
  sort?: string
  onSortChange?: (sort: string) => void
  onAddSkill?: (name: string) => void
}

const SORT_OPTIONS = [
  { key: 'best_match', label: 'Best match' },
  { key: 'recent',     label: 'Most recent' },
  { key: 'popular',    label: 'Most popular' },
  { key: 'deadline',   label: 'Closing soon' },
  { key: 'activity',   label: 'Most active' },
]

export function SearchToolbar({
  q, onQueryChange, onOpenFilters, activeFilterCount = 0, sort = 'best_match', onSortChange, onAddSkill,
}: Props) {
  const [local, setLocal] = useState(q)
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocal(q) }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== q) onQueryChange(local)
    }, 300)
    return () => clearTimeout(t)
  }, [local, q, onQueryChange])

  return (
    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
      <div ref={wrapRef} className="relative flex-1 min-w-[200px]">
        <MagnifyingGlass
          size={15}
          weight="regular"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          role="searchbox"
          aria-label="Search opportunities, skills, people, projects, ventures"
          data-teamup-search
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search opportunities, skills, ventures, projects, people..."
          className="w-full h-11 pl-10 pr-9 rounded-md bg-zinc-950 border border-zinc-800 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {local && (
          <button
            onClick={() => { setLocal(''); onQueryChange('') }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          >
            <X size={12} weight="bold" />
          </button>
        )}
        <UniversalSearchDropdown
          query={local}
          open={focused && local.length >= 2}
          onClose={() => setFocused(false)}
          onSelectSkill={(name) => onAddSkill?.(name)}
        />
      </div>
      <button
        onClick={onOpenFilters}
        aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
        className="relative inline-flex items-center gap-2 h-11 px-4 rounded-md border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40 bg-transparent text-zinc-200 text-[13.5px] font-semibold transition-colors shrink-0"
      >
        Filters
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[11px] font-bold bg-white text-black">
            {activeFilterCount}
          </span>
        )}
      </button>
      {onSortChange && (
        <div className="relative shrink-0">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort order"
            className="h-11 pl-4 pr-9 rounded-md border border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-200 text-[13.5px] font-semibold cursor-pointer focus:outline-none focus:border-zinc-600 appearance-none transition-colors"
            style={{
              backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
