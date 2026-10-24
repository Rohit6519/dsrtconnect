'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LocationData {
  display_name: string
  city: string
  region?: string
  country: string
  country_code?: string
  latitude?: number
  longitude?: number
  provider_place_id?: string
}

interface Props {
  value: LocationData | string | null
  onChange: (location: LocationData | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

// Request sequence tracking to prevent stale results
let activeRequestId = 0

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = 'Search city or region...', 
  disabled,
  className,
  autoFocus 
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationData[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<LocationData | null>(
    typeof value === 'object' ? value : null
  )
  const [highlightIndex, setHighlightIndex] = useState(-1)
  
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Initialize display value
  useEffect(() => {
    if (typeof value === 'object' && value) {
      setSelected(value)
      setQuery(value.display_name)
    } else if (typeof value === 'string' && value) {
      setQuery(value)
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    const requestId = ++activeRequestId
    setLoading(true)

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=8&language=en&format=json`
      )
      
      // Guard against stale responses
      if (requestId !== activeRequestId) return

      const data = await res.json()
      
      if (data.results && Array.isArray(data.results)) {
        const mapped: LocationData[] = data.results.map((r: any) => ({
          display_name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
          city: r.name,
          region: r.admin1,
          country: r.country,
          country_code: r.country_code,
          latitude: r.latitude,
          longitude: r.longitude,
          provider_place_id: r.id?.toString()
        }))
        setResults(mapped)
        setIsOpen(true)
      } else {
        setResults([])
      }
    } catch (err) {
      if (requestId === activeRequestId) {
        setResults([])
      }
    } finally {
      if (requestId === activeRequestId) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    if (selected && query === selected.display_name) {
      return
    }

    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(query)
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected, searchLocations])

  const handleSelect = (location: LocationData) => {
    setSelected(location)
    setQuery(location.display_name)
    setIsOpen(false)
    setHighlightIndex(-1)
    onChange(location)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setResults([])
    onChange(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        handleSelect(results[highlightIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div className={cn("relative w-full", className)} ref={wrapperRef}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          <MapPin className="w-4 h-4" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            if (selected && e.target.value !== selected.display_name) {
              setSelected(null)
            }
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full h-10 pl-10 pr-10 rounded-md bg-[#050505] border text-white text-[13px]",
            "placeholder:text-white/30 focus:outline-none transition-all",
            selected 
              ? "border-emerald-500/40 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30" 
              : "border-white/10 focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
          {!loading && selected && (
            <button
              type="button"
              onClick={handleClear}
              className="text-white/40 hover:text-white transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!loading && !selected && query.length >= 2 && results.length > 0 && (
            <Check className="w-3.5 h-3.5 text-white/30" />
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0C0C0E] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-100">
          <ul className="max-h-64 overflow-y-auto py-1">
            {results.map((location, idx) => (
              <li key={location.provider_place_id || idx}>
                <button
                  type="button"
                  onClick={() => handleSelect(location)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={cn(
                    "w-full text-left px-3 py-2 transition-colors flex items-start gap-2.5",
                    highlightIndex === idx ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-white/90 truncate">
                      {location.city}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 truncate">
                      {[location.region, location.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No results state */}
      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0C0C0E] border border-white/10 rounded-lg shadow-2xl p-3 z-50">
          <p className="text-[12px] text-white/40 text-center">No locations found for "{query}"</p>
        </div>
      )}
    </div>
  )
}