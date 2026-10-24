'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CaretDown, Check } from '@phosphor-icons/react'

interface SortOption {
  id: string
  label: string
}

const SORT_OPTIONS: SortOption[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rising', label: 'Rising' },
  { id: 'newest', label: 'Recently added' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'most_followed', label: 'Most followed' },
]

interface SortDropdownProps {
  value: string
  onChange: (value: string) => void
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = SORT_OPTIONS.find(o => o.id === value) || SORT_OPTIONS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[#121215] border border-white/[0.08] hover:border-white/[0.16] text-white text-[12px] font-semibold transition-all"
      >
        <span className="text-zinc-400">Sort:</span>
        <span>{selected.label}</span>
        <CaretDown size={11} weight="bold" className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 w-52 bg-[#0d0d10] border border-white/[0.1] rounded-xl shadow-2xl py-1">
          {SORT_OPTIONS.map((opt) => {
            const isSelected = opt.id === value
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors ${
                  isSelected 
                    ? 'text-white bg-white/[0.06] font-semibold' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={12} weight="bold" className="text-emerald-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}