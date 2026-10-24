'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { MagnifyingGlass, Spinner, Check } from '@phosphor-icons/react'

interface AutocompleteInputProps<T> {
  value: string
  onChange: (value: string) => void
  onSelect: (item: T) => void
  fetchSuggestions: (query: string) => Promise<T[]>
  renderItem: (item: T) => React.ReactNode
  getItemKey: (item: T) => string
  getItemLabel: (item: T) => string
  placeholder?: string
  minChars?: number
  debounceMs?: number
  allowCreate?: boolean
  onCreate?: (value: string) => void
  className?: string
  autoFocus?: boolean
}

export function AutocompleteInput<T>({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  renderItem,
  getItemKey,
  getItemLabel,
  placeholder = 'Search...',
  minChars = 2,
  debounceMs = 250,
  allowCreate = false,
  onCreate,
  className,
  autoFocus = false,
}: AutocompleteInputProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch suggestions with debounce
  useEffect(() => {
    if (value.length < minChars) {
      setItems([])
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const results = await fetchSuggestions(value)
        setItems(results)
        setHighlighted(0)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, minChars, debounceMs, fetchSuggestions])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item: T) => {
    onSelect(item)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) {
      if (e.key === 'Enter' && allowCreate && onCreate && value.trim()) {
        e.preventDefault()
        onCreate(value.trim())
        setOpen(false)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[highlighted]) {
        handleSelect(items[highlighted])
      } else if (allowCreate && onCreate && value.trim()) {
        onCreate(value.trim())
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" weight="bold" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-9 pl-8 pr-8 text-[13px] bg-zinc-900/60 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        {loading && (
          <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 animate-spin" weight="bold" />
        )}
      </div>

      {/* Dropdown */}
      {open && value.length >= minChars && (items.length > 0 || allowCreate) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] max-h-64 overflow-y-auto z-50">
          {items.map((item, i) => (
            <button
              key={getItemKey(item)}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                'w-full text-left px-3 py-2 text-[13px] transition-colors flex items-center justify-between',
                i === highlighted
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-900'
              )}
            >
              <div className="flex-1 min-w-0">{renderItem(item)}</div>
              {i === highlighted && <Check className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" weight="bold" />}
            </button>
          ))}

          {allowCreate && value.trim() && !items.some((it) => getItemLabel(it).toLowerCase() === value.trim().toLowerCase()) && onCreate && (
            <button
              onClick={() => { onCreate(value.trim()); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[13px] text-blue-400 hover:bg-zinc-900 border-t border-zinc-800 flex items-center gap-2"
            >
              <span className="text-zinc-500">+</span>
              Create <span className="font-semibold">&ldquo;{value.trim()}&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}