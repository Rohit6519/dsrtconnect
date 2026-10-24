'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Sector {
  id: string
  name: string
  slug: string
  category: string
  popular: boolean
}

interface SectorSelectorProps {
  selected: string[]
  onChange: (sectors: string[]) => void
  max?: number
}

export function SectorSelector({
  selected,
  onChange,
  max = 5,
}: SectorSelectorProps) {
  const supabase = createClient()
  const [allSectors, setAllSectors] = useState<Sector[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('sectors')
      .select('*')
      .order('popular', { ascending: false })
      .order('name')
      .then(({ data }) => setAllSectors(data || []))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const popular = allSectors.filter((s) => s.popular)
  const filtered = search
    ? allSectors.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : popular

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name))
    } else if (selected.length < max) {
      onChange([...selected, name])
    }
  }

  const remove = (name: string) => {
    onChange(selected.filter((s) => s !== name))
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-primary text-primary-foreground"
            >
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            selected.length >= max
              ? `Max ${max} sectors`
              : 'Search sectors (FinTech, HealthTech, Aerospace...)'
          }
          disabled={selected.length >= max}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-border/40 bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>

      {/* Dropdown list */}
      {open && (
        <div className="rounded-xl border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {search === '' && (
            <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/40">
              Popular Sectors
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No sectors found for &quot;{search}&quot;
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((s) => {
                const isSelected = selected.includes(s.name)
                const disabled = !isSelected && selected.length >= max
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => !disabled && toggle(s.name)}
                    disabled={disabled}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-primary/5',
                      disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      {s.popular && (
                        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded bg-amber-500/10 text-amber-500 font-semibold">
                          Popular
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {selected.length}/{max} selected
      </p>
    </div>
  )
}