'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Check, Plus, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchSelectorProps {
  value: any | null
  onChange: (value: any) => void
  placeholder?: string
  searchEndpoint: string
  createEndpoint?: string
  responseKey: string
  displayField?: string
  subField?: string
  allowCreate?: boolean
  extraParams?: Record<string, string>
  onCreate?: (name: string) => Promise<any>
}

export function SearchSelector({
  value,
  onChange,
  placeholder = 'Search...',
  searchEndpoint,
  responseKey,
  displayField = 'name',
  subField,
  allowCreate = true,
  extraParams = {},
  onCreate,
}: SearchSelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query, ...extraParams })
        const res = await fetch(`${searchEndpoint}?${params}`)
        const data = await res.json()
        setResults(data[responseKey] || [])
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (item: any) => {
    onChange(item)
    setQuery('')
    setOpen(false)
  }

  const handleCreate = async () => {
    if (!query.trim()) return
    setCreating(true)
    try {
      if (onCreate) {
        const newItem = await onCreate(query.trim())
        if (newItem) {
          onChange(newItem)
          setQuery('')
          setOpen(false)
        }
      }
    } catch (err) {
      console.error('Create error:', err)
    } finally {
      setCreating(false)
    }
  }

  const displayValue = value?.[displayField]
  const noResults = !loading && results.length === 0 && query.trim().length > 0
  const exactMatch = results.find(r => r[displayField]?.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      {value && !open ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border rounded-md bg-muted/30">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayValue}</p>
            {subField && value[subField] && (
              <p className="text-xs text-muted-foreground truncate">{value[subField]}</p>
            )}
          </div>
          <button
            onClick={() => {
              onChange(null)
              setQuery('')
              setOpen(true)
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-3 border rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl z-50 max-h-72 overflow-y-auto">
          {results.length > 0 && (
            <div className="py-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item[displayField]}</p>
                    {subField && item[subField] && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item[subField]}
                        {item.city && ` · ${item.city}`}
                        {item.state && `, ${item.state}`}
                      </p>
                    )}
                    {item.category && !subField && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.category}
                      </p>
                    )}
                  </div>
                  {item.usage_count > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.usage_count}x used
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {noResults && (
            <div className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                No results for "{query}"
              </p>
            </div>
          )}

          {allowCreate && query.trim() && !exactMatch && !loading && (
            <div className="border-t p-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 text-primary text-sm font-medium disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add "{query.trim()}" to system
              </button>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Others can find it after you add it
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}