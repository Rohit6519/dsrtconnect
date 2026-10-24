'use client'

import { useEffect } from 'react'
import { MagnifyingGlass, SlidersHorizontal } from '@phosphor-icons/react'

interface Props {
  value: string
  onChange: (v: string) => void
  onAdvanced?: () => void
}

export function SearchBar({ value, onChange, onAdvanced }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('looking-for-search')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <MagnifyingGlass
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          id="looking-for-search"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search opportunities, skills, roles, projects, people..."
          data-teamup-search
          className="w-full h-11 pl-10 pr-16 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10.5px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 h-5 rounded flex items-center">
          ⌘ K
        </span>
      </div>

      {onAdvanced && (
        <button
          onClick={onAdvanced}
          className="hidden md:inline-flex items-center gap-1.5 h-11 px-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <SlidersHorizontal size={13} weight="regular" />
          Advanced Search
        </button>
      )}
    </div>
  )
}