'use client'

import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlass, CircleNotch } from '@phosphor-icons/react'
import { useDSRTUserSearch, type DSRTUser } from '../hooks/useDSRTUserSearch'

interface Props {
  onSelect: (user: DSRTUser) => void
  autoFocus?: boolean
  placeholder?: string
}

export function UserSearchInput({ onSelect, autoFocus, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { results, loading, error } = useDSRTUserSearch(query)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (user: DSRTUser) => {
    onSelect(user)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Search DSRT users by @username or name...'}
          className="w-full h-11 pl-9 pr-4 bg-[#09090b] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.15]"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CircleNotch size={14} className="animate-spin text-zinc-500" />
          </div>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-[320px] overflow-y-auto bg-[#0d0d10] border border-white/[0.08] rounded-lg shadow-2xl z-30">
          {loading ? (
            <div className="p-4 flex items-center gap-2 text-[12px] text-zinc-500">
              <CircleNotch size={12} className="animate-spin" /> Searching DSRT directory…
            </div>
          ) : error ? (
            <div className="p-4 text-[12px] text-red-400">Search failed. Please try again.</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-[12px] text-zinc-500">
              No users found matching "{query}"
            </div>
          ) : (
            <div className="py-1">
              {results.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      u.full_name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white truncate">{u.full_name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">@{u.username}</p>
                    {u.tagline && (
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{u.tagline}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {query.length > 0 && query.length < 2 && (
        <p className="mt-2 text-[11px] text-zinc-600">Type at least 2 characters to search</p>
      )}
    </div>
  )
}