'use client'

import React, { useState, useMemo } from 'react'
import { CaretDown, CaretUp, MagnifyingGlass } from '@phosphor-icons/react'

interface FilterOption {
  id: string
  label: string
  count?: number
}

interface FilterSectionProps {
  title: string
  options: FilterOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
  defaultOpen?: boolean
  searchable?: boolean
  maxHeight?: string
  showCounts?: boolean
}

export function FilterSection({
  title,
  options,
  selectedIds,
  onToggle,
  defaultOpen = false,
  searchable = false,
  maxHeight = '260px',
  showCounts = true,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState('')

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  const selectedCount = selectedIds.length

  return (
    <div className="pt-2 border-t border-white/[0.04] first:border-t-0 first:pt-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-[12.5px] font-bold text-white py-1 group"
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {selectedCount > 0 && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
              {selectedCount}
            </span>
          )}
        </div>
        {open ? <CaretUp size={11} className="text-zinc-500 group-hover:text-white" /> : <CaretDown size={11} className="text-zinc-500 group-hover:text-white" />}
      </button>

      {open && (
        <div className="space-y-1.5 pt-2">
          {searchable && options.length > 8 && (
            <div className="relative mb-1.5">
              <MagnifyingGlass size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full h-7 pl-6 pr-2 rounded-md bg-[#09090b] border border-white/[0.06] text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
          )}

          <div 
            className="space-y-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" 
            style={{ maxHeight }}
          >
            {filteredOptions.length === 0 ? (
              <p className="text-[11px] text-zinc-600 italic py-1">No matches</p>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedIds.includes(opt.id)
                return (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-white cursor-pointer py-0.5 group"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(opt.id)}
                      className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="truncate flex-1">{opt.label}</span>
                    {showCounts && typeof opt.count === 'number' && opt.count > 0 && (
                      <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
                        {opt.count}
                      </span>
                    )}
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}