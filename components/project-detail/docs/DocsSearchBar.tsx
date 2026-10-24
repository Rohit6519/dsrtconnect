'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'

interface SearchResult {
  id: string
  title: string
  slug: string | null
  excerpt: string
  is_published: boolean
}

interface Props {
  slug: string
  onSelect: (docId: string) => void
}

export function DocsSearchBar({ slug, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/projects/' + slug + '/documentation/search?q=' + encodeURIComponent(query))
        const json = await res.json()
        setResults(json.results || [])
        setOpen(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, slug])

  return (
    <div className="relative">
      <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" size={13} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search docs..."
        className="w-full pl-8 pr-8 h-8 bg-white/[0.04] border border-white/[0.08] rounded-md text-[12px] text-white placeholder:text-white/35 outline-none focus:border-white/25"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
        >
          <X size={11} />
        </button>
      )}

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-40 top-9 left-0 right-0 max-h-[300px] overflow-y-auto bg-[#12121a] border border-white/[0.1] rounded-lg shadow-2xl">
          {loading && results.length === 0 ? (
            <div className="p-3 text-center text-[12px] text-white/40">Searching...</div>
          ) : (
            <div className="py-1">
              {results.map(r => (
                <button
                  key={r.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onSelect(r.id); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.05] border-b border-white/[0.04] last:border-0"
                >
                  <p className="text-[13px] font-semibold text-white truncate">{r.title}</p>
                  {r.excerpt && (
                    <p
                      className="text-[11px] text-white/50 truncate mt-0.5"
                      dangerouslySetInnerHTML={{ __html: r.excerpt.replace(/</g, '&lt;').replace(/&lt;b&gt;/g, '<mark class="bg-yellow-400/30 text-yellow-100">').replace(/&lt;\/b&gt;/g, '</mark>') }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
