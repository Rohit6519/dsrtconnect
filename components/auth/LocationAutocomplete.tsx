'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocationAutocompleteProps {
  value: string
  onChange: (val: string) => void
}

export function LocationAutocomplete({ value, onChange }: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Sync external value changes
  useEffect(() => {
    if (value !== query) setQuery(value)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch locations
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Don't search if the query exactly matches a selected result
    if (query === value && results.length === 0) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`)
        const data = await res.json()
        if (data.results && Array.isArray(data.results)) {
          setResults(data.results)
          setIsOpen(true)
        } else {
          setResults([])
        }
      } catch (err) {
        console.error("Location search failed", err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = (city: any) => {
    const locationString = [city.name, city.admin1, city.country].filter(Boolean).join(', ')
    setQuery(locationString)
    onChange(locationString)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value) // Propagate typed value
          }}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder="City, Region — where you are based"
          className={cn(
            "w-full h-10 px-3 rounded-md border text-[13px] text-white transition-all",
            "bg-[#050505] border-white/10 placeholder:text-white/30",
            "focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF]"
          )}
        />
        {loading && (
          <div className="absolute right-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0C0C0E] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
          <ul className="max-h-60 overflow-y-auto py-1">
            {results.map((city, idx) => (
              <li key={`${city.id}-${idx}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors flex flex-col"
                >
                  <span className="text-[13px] font-medium text-white/90">{city.name}</span>
                  <span className="text-[11px] text-white/40 mt-0.5">
                    {[city.admin1, city.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}