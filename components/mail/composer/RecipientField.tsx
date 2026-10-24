'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, User, Rocket, Buildings, MagnifyingGlass, CheckCircle, Warning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Recipient {
  identity_id?: string | null
  entity_type: 'user' | 'project' | 'venture' | 'opportunity'
  entity_id?: string
  dsrt_email: string
  display_name: string
  avatar_url?: string
  subtitle?: string
  verified?: boolean
}

interface Props {
  label: string
  value: Recipient[]
  onChange: (recipients: Recipient[]) => void
  autoFocus?: boolean
}

const ENTITY_META = {
  user: { icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Person' },
  venture: { icon: Buildings, color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Venture' },
  project: { icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Project' },
  opportunity: { icon: Buildings, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Opportunity' },
}

export function RecipientField({ label, value, onChange, autoFocus }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Recipient[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Debounced search
  useEffect(() => {
    if (query.length < 1) { 
      setResults([])
      setLoading(false)
      return 
    }

    setLoading(true)
    const t = setTimeout(async () => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      try {
        const res = await fetch(
          `/api/mail/recipients/search?q=${encodeURIComponent(query)}`,
          { signal: abortRef.current.signal }
        )
        const data = await res.json()
        // Filter out already-selected recipients
        const filtered = (data.results || []).filter((r: Recipient) => 
          !value.some(v => 
            (v.identity_id && r.identity_id && v.identity_id === r.identity_id) ||
            (v.dsrt_email.toLowerCase() === r.dsrt_email.toLowerCase())
          )
        )
        setResults(filtered)
        setActiveIndex(0)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => clearTimeout(t)
  }, [query, value])

  const addRecipient = useCallback((r: Recipient) => {
    onChange([...value, r])
    setQuery('')
    setResults([])
    setActiveIndex(0)
    inputRef.current?.focus()
  }, [value, onChange])

  const removeRecipient = useCallback((identityId?: string | null, email?: string) => {
    onChange(value.filter(r => {
      if (identityId && r.identity_id === identityId) return false
      if (email && r.dsrt_email.toLowerCase() === email.toLowerCase()) return false
      return true
    }))
  }, [value, onChange])

  // Handle raw email entry (when user types email and hits Enter/comma/Tab)
  const handleRawEmailEntry = useCallback(() => {
    const trimmed = query.trim()
    if (!trimmed) return false

    // Check if it looks like an email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    let email = trimmed
    if (!email.includes('@')) {
      email = `${email}@dsrt.com`
    }

    if (emailPattern.test(email)) {
      // Check for duplicate
      if (value.some(r => r.dsrt_email.toLowerCase() === email.toLowerCase())) {
        setQuery('')
        return true
      }
      addRecipient({
        identity_id: null,
        entity_type: 'user',
        entity_id: '',
        dsrt_email: email.toLowerCase(),
        display_name: email.split('@')[0],
      })
      return true
    }
    return false
  }, [query, value, addRecipient])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !query && value.length > 0) {
      const last = value[value.length - 1]
      removeRecipient(last.identity_id, last.dsrt_email)
      return
    }

    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
      return
    }

    if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
      return
    }

    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',') {
      if (results.length > 0 && showResults) {
        e.preventDefault()
        addRecipient(results[activeIndex])
      } else if (query.trim()) {
        e.preventDefault()
        handleRawEmailEntry()
      }
    }

    if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.05] hover:border-white/[0.08] focus-within:border-white/[0.15] transition-colors">
        <span className="text-[11px] font-bold text-white/45 uppercase tracking-wider pt-1.5 w-8 flex-shrink-0">
          {label}
        </span>
        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[32px]">
          {value.map((r, idx) => {
            const meta = ENTITY_META[r.entity_type] || ENTITY_META.user
            const Icon = meta.icon
            const isUnresolved = !r.identity_id && !r.entity_id
            return (
              <div 
                key={`${r.identity_id || r.dsrt_email}-${idx}`}
                className={cn(
                  "flex items-center gap-1.5 h-7 pl-1.5 pr-1 rounded-md border transition-colors group",
                  isUnresolved 
                    ? "bg-amber-500/[0.08] border-amber-500/20 hover:bg-amber-500/[0.12]"
                    : "bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08]"
                )}
                title={r.dsrt_email}
              >
                <div className="w-5 h-5 rounded overflow-hidden bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon className={cn("w-3 h-3", meta.color)} weight="fill" />
                  )}
                </div>
                <span className="text-[11.5px] font-semibold text-white">{r.display_name}</span>
                {r.verified && <CheckCircle className="w-2.5 h-2.5 text-blue-400" weight="fill" />}
                {isUnresolved && <Warning className="w-2.5 h-2.5 text-amber-400" weight="fill" />}
                <button
                  type="button"
                  onClick={() => removeRecipient(r.identity_id, r.dsrt_email)}
                  className="w-4 h-4 rounded hover:bg-white/[0.1] text-white/50 hover:text-white flex items-center justify-center transition-colors ml-0.5"
                >
                  <X className="w-2.5 h-2.5" weight="bold" />
                </button>
              </div>
            )
          })}
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            value={query}
            onChange={e => { setQuery(e.target.value); setShowResults(true) }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? "Search or enter DSRT email..." : ""}
            className="flex-1 min-w-[200px] h-7 bg-transparent text-[12.5px] text-white placeholder:text-white/30 focus:outline-none font-medium"
          />
        </div>
      </div>

      {showResults && query.length >= 1 && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden",
          "bg-gradient-to-b from-[#141419] to-[#0a0a0f]",
          "border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.6)]",
          "max-h-[360px] overflow-y-auto"
        )}>
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <p className="text-[11px] text-white/40 mt-2">Searching DSRT...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <MagnifyingGlass className="w-5 h-5 text-white/25 mx-auto mb-2" />
              <p className="text-[12px] text-white/50 font-semibold">No matches for "{query}"</p>
              <p className="text-[10.5px] text-white/35 mt-1.5">
                Try a username, project name, or @dsrt.com email
              </p>
              {query.includes('@') && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleRawEmailEntry() }}
                  className="mt-3 text-[11px] font-semibold text-violet-300 hover:text-violet-200 px-3 py-1.5 rounded bg-violet-500/10 border border-violet-500/20"
                >
                  Send to "{query}" anyway
                </button>
              )}
            </div>
          ) : (
            <div className="p-1.5">
              {results.map((r, idx) => {
                const meta = ENTITY_META[r.entity_type] || ENTITY_META.user
                const Icon = meta.icon
                const isActive = idx === activeIndex
                return (
                  <button
                    key={`${r.entity_type}-${r.entity_id || r.dsrt_email}-${idx}`}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addRecipient(r) }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                      isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn("w-full h-full flex items-center justify-center", meta.bg)}>
                          <Icon className={cn("w-4 h-4", meta.color)} weight="fill" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12.5px] font-bold text-white truncate">{r.display_name}</p>
                        {r.verified && <CheckCircle className="w-3 h-3 text-blue-400 flex-shrink-0" weight="fill" />}
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0",
                          meta.color, meta.bg, "border border-white/[0.05]"
                        )}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-white/50 truncate font-mono mt-0.5">{r.dsrt_email}</p>
                      {r.subtitle && (
                        <p className="text-[10px] text-white/40 truncate mt-0.5">{r.subtitle}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}