'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  PencilSimple,
  X,
  Spinner,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface LocationSectionProps {
  location: string | null
  isOwner: boolean
  onLocationChange: (location: string | null) => void
}

interface LocationResult {
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string | null
    state?: string | null
    country?: string | null
  }
}

export function LocationSection({
  location,
  isOwner,
  onLocationChange,
}: LocationSectionProps) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searched, setSearched] = useState(false) // true after at least one search finishes
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch suggestions
  useEffect(() => {
    if (!editing) return

    if (query.trim().length < 2) {
      setSuggestions([])
      setLoading(false)
      setSearched(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    setLoading(true)
    setSearched(false)

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(query.trim())}`,
        )
        if (res.ok) {
          const data = await res.json()
          const results = Array.isArray(data?.results) ? data.results : []
          setSuggestions(results.slice(0, 8))
        } else {
          setSuggestions([])
        }
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, editing])

  // Focus + seed query when opening editor
  useEffect(() => {
    if (editing) {
      setQuery(location || '')
      setSuggestions([])
      setSearched(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editing, location])

  // Close on outside click
  useEffect(() => {
    if (!editing) return
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editing])

  const selectSuggestion = async (result: LocationResult) => {
    setSaving(true)
    try {
      const address = result.address || {}
      const res = await fetch('/api/profile/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          city: address.city || null,
          state: address.state || null,
          country: address.country || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || 'Failed')
      }
      const data = await res.json()
      onLocationChange(data.location)
      toast.success('Location updated')
      setEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const clearLocation = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display: '' }),
      })
      if (!res.ok) throw new Error('Failed')
      onLocationChange(null)
      toast.success('Location cleared')
      setEditing(false)
    } catch {
      toast.error('Failed to clear location')
    } finally {
      setSaving(false)
    }
  }

  // Show dropdown whenever editing AND (loading OR has results OR finished empty search)
  const showDropdown =
    editing &&
    query.trim().length >= 2 &&
    (loading || searched)

  return (
    <div ref={containerRef} className="relative">
      {editing ? (
        <>
          {/* Input */}
          <div className="relative">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500"
              weight="fill"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false)
                if (e.key === 'Enter' && suggestions[0] && !saving) {
                  e.preventDefault()
                  selectSuggestion(suggestions[0])
                }
              }}
              placeholder="Search any city worldwide..."
              disabled={saving}
              className="w-full h-9 pl-8 pr-8 text-[13px] bg-zinc-900/60 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            />
            {loading && (
              <Spinner
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 animate-spin"
                weight="bold"
              />
            )}
            {!loading && query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSuggestions([])
                  setSearched(false)
                  inputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
              >
                <X className="w-3 h-3" weight="bold" />
              </button>
            )}
          </div>

          {/* Dropdown — ALWAYS shows when searching (loading / results / empty) */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] max-h-72 overflow-y-auto"
              >
                {loading && (
                  <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-zinc-500">
                    <Spinner className="w-3.5 h-3.5 animate-spin" weight="bold" />
                    Searching cities...
                  </div>
                )}

                {!loading && suggestions.length === 0 && searched && (
                  <div className="px-3 py-4 text-center">
                    <MagnifyingGlass
                      className="w-5 h-5 text-zinc-700 mx-auto mb-1.5"
                      weight="duotone"
                    />
                    <p className="text-[12px] text-zinc-500">
                      No places found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Try a city name like &ldquo;London&rdquo; or &ldquo;Tokyo&rdquo;
                    </p>
                  </div>
                )}

                {!loading &&
                  suggestions.map((result, i) => (
                    <button
                      key={`${result.lat}-${result.lon}-${i}`}
                      type="button"
                      onClick={() => selectSuggestion(result)}
                      disabled={saving}
                      className="w-full text-left px-3 py-2.5 text-[13px] text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-start gap-2.5 transition-colors border-b border-zinc-900 last:border-0 disabled:opacity-50"
                    >
                      <MapPin
                        className="w-3.5 h-3.5 text-zinc-600 mt-0.5 flex-shrink-0"
                        weight="duotone"
                      />
                      <span className="flex-1 leading-snug">
                        {result.display_name}
                      </span>
                    </button>
                  ))}

                {/* Clear current location */}
                {location && !loading && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    disabled={saving}
                    className="w-full text-left px-3 py-2.5 text-[12px] text-red-400 hover:bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <X className="w-3 h-3" weight="bold" />
                    Clear location
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : location ? (
        /* View mode with location set */
        <div className="group flex items-center gap-1.5">
          <MapPin
            className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0"
            weight="fill"
          />
          <span className="text-[13px] text-zinc-400 flex-1 truncate">
            {location}
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              title="Edit location"
            >
              <PencilSimple className="w-3 h-3" weight="bold" />
            </button>
          )}
        </div>
      ) : isOwner ? (
        /* Empty state — owner */
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-[12px] text-zinc-600 italic hover:text-zinc-400 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" weight="duotone" />
          Add location
        </button>
      ) : null}
    </div>
  )
}