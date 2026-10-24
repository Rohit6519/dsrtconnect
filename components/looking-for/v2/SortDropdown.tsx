'use client'

import { useState, useRef, useEffect } from 'react'
import { CaretDown } from '@phosphor-icons/react'

const OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'recently-updated', label: 'Recently Updated' },
  { value: 'most-active', label: 'Most Active' },
  { value: 'fewest-applications', label: 'Fewest Applications' },
  { value: 'highest-budget', label: 'Highest Budget' },
  { value: 'lowest-budget', label: 'Lowest Budget' },
  { value: 'ending-soon', label: 'Ending Soon' },
]

interface Props {
  value: string
  onChange: (v: string) => void
}

export function SortDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const current = OPTIONS.find(o => o.value === value)?.label || 'Recommended'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[12px] font-medium text-zinc-300 hover:text-white transition-colors"
      >
        <span className="text-zinc-500">Sort by:</span>
        <span className="text-white">{current}</span>
        <CaretDown size={10} weight="bold" className="text-zinc-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-zinc-800 bg-zinc-950 shadow-xl z-20 py-1">
          {OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={
                'w-full text-left px-3 py-2 text-[12.5px] transition-colors ' +
                (value === o.value
                  ? 'text-white bg-zinc-900 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
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