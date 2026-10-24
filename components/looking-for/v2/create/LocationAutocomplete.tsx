'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, X, Globe } from '@phosphor-icons/react'

interface Props {
  value: string
  onChange: (location: string) => void
  placeholder?: string
}

const QUICK_OPTIONS = [
  'Anywhere / Remote',
  'Worldwide',
  'United States',
  'India',
  'Europe',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'Singapore',
  'Japan',
  'France',
  'Netherlands',
  'UAE',
]

interface Suggestion {
  display_name: string
  city: string
  country: string
  state?: string
}

export function LocationAutocomplete({ value, onChange, placeholder = 'Search any city...' }: Props) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Debounced search via OpenStreetMap Nominatim (free, no API key)
  useEffect(() => {
    if (!open || query.length < 2) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const url =
          'https://nominatim.openstreetmap.org/search?format=json&limit=8&featureType=city&q=' +
          encodeURIComponent(query)

        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' },
        })

        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        if (cancelled) return

        const mapped: Suggestion[] = (data || []).map((d: any) => {
          const parts = (d.display_name || '')
            .split(',')
            .map((p: string) => p.trim())
          return {
            display_name: d.display_name,
            city: parts[0] || d.display_name,
            country: parts[parts.length - 1] || '',
            state: parts.length > 2 ? parts[parts.length - 2] : undefined,
          }
        })

        setSuggestions(mapped)
      } catch {
        setSuggestions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open])

  const selectSuggestion = useCallback(
    (s: Suggestion) => {
      const label = s.state
        ? `${s.city}, ${s.state}, ${s.country}`
        : `${s.city}, ${s.country}`
      onChange(label)
      setQuery(label)
      setOpen(false)
      setSelectedIdx(-1)
    },
    [onChange]
  )

  const selectQuickOption = useCallback(
    (val: string) => {
      onChange(val)
      setQuery(val)
      setOpen(false)
    },
    [onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        selectSuggestion(suggestions[selectedIdx])
      } else if (query.trim()) {
        onChange(query.trim())
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const clearValue = () => {
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input */}
      <div className="relative">
        <MapPin
          size={12}
          weight="regular"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setSelectedIdx(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            'w-full h-9 pl-8 pr-8 rounded-md text-[12.5px] text-zinc-200 placeholder:text-zinc-600 ' +
            'bg-zinc-950 border border-zinc-800 ' +
            'focus:outline-none focus:border-zinc-700 transition-colors'
          }
        />
        {query && (
          <button
            onClick={clearValue}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
          >
            <X size={10} weight="bold" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={
            'absolute z-50 left-0 right-0 top-full mt-1 rounded-lg overflow-hidden max-h-80 overflow-y-auto ' +
            'border border-zinc-800 bg-[#0f0f0f] ' +
            'shadow-[0_12px_40px_rgba(0,0,0,0.7)]'
          }
        >
          {/* Quick options — show when input is empty or < 2 chars */}
          {(!query || query.length < 2) && (
            <>
              <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-950/50">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-500">
                  Quick options
                </span>
              </div>
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => selectQuickOption(opt)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-900 transition-colors"
                >
                  <Globe
                    size={11}
                    weight="regular"
                    className="text-zinc-500 shrink-0"
                  />
                  <span className="text-[12px] text-zinc-300">{opt}</span>
                </button>
              ))}
            </>
          )}

          {/* Search results */}
          {query.length >= 2 && (
            <>
              {loading && suggestions.length === 0 && (
                <div className="px-3 py-3 text-[11.5px] text-zinc-500 text-center">
                  Searching cities worldwide...
                </div>
              )}

              {!loading && query.length >= 2 && suggestions.length === 0 && (
                <div className="px-3 py-3 text-[11.5px] text-zinc-500 text-center">
                  No cities found for &ldquo;{query}&rdquo;
                </div>
              )}

              {suggestions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-950/50">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-500">
                      Cities
                    </span>
                  </div>
                  {suggestions.map((s, i) => {
                    const isSelected = i === selectedIdx
                    return (
                      <button
                        key={s.display_name + i}
                        onClick={() => selectSuggestion(s)}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className={
                          'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ' +
                          (isSelected
                            ? 'bg-zinc-900'
                            : 'hover:bg-zinc-900/60')
                        }
                      >
                        <MapPin
                          size={11}
                          weight="regular"
                          className="text-zinc-500 shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] text-zinc-200 font-medium truncate">
                            {s.city}
                          </div>
                          <div className="text-[10.5px] text-zinc-500 truncate">
                            {s.state
                              ? `${s.state}, ${s.country}`
                              : s.country}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}