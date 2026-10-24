'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X, Loader2, Users, ShieldCheck, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function DiscoverHero() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<{ communities: any[]; people: any[] }>({ communities: [], people: [] })
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q || q.length < 2) {
      setResults({ communities: [], people: [] })
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/community/discover/search?q=${encodeURIComponent(q)}&limit=5`,
          { signal: ctrl.signal }
        )
        const json = await res.json()
        setResults(json?.data || { communities: [], people: [] })
      } catch {
        // ignore aborts
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <section className="relative w-full min-h-[380px] md:min-h-[420px] rounded-3xl overflow-hidden flex flex-col items-center justify-center p-6 text-center border border-white/[0.08]">
      {/* Deep dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#10131a] to-[#0a0a0f] z-0" />
      
      {/* Subtle cerulean/blue ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[120px] rounded-full z-0 pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-2xl mx-auto w-full mt-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50 mb-4">
            Community Hub · Discover
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-[54px] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 pb-2">
            DSRT COMMUNITY
          </h1>
          <p className="mt-2 text-xl md:text-2xl font-medium text-white/80 italic tracking-wide">
            " Connection jo kaam aaya "
          </p>
        </div>

        <div ref={rootRef} className="relative max-w-xl mx-auto w-full pt-4">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border transition-all duration-300 shadow-2xl',
              open
                ? 'border-white/[0.2] bg-[#0c0c12]/80 backdrop-blur-xl'
                : 'border-white/[0.1] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]'
            )}
          >
            <div className="pl-5 pr-1 text-white/50">
              <Search className="w-4 h-4" strokeWidth={2} />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Search communities, people..."
              className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-white/40 py-3.5"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="mr-3 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-3 rounded-2xl border border-white/[0.08] bg-[#0c0c12]/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-30 text-left">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-[13px] text-white/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching DSRT...
                </div>
              ) : (results.communities.length === 0 && results.people.length === 0) ? (
                <div className="px-4 py-8 text-[13px] text-white/50 text-center">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
                  
                  {/* Communities Results */}
                  {results.communities.length > 0 && (
                    <div className="mb-2">
                      <p className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/40">
                        Communities
                      </p>
                      {results.communities.map((c) => (
                        <Link
                          key={c.id}
                          href={`/community/${c.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg border border-white/[0.06] bg-white/[0.03] overflow-hidden flex-shrink-0">
                            {c.cover_url ? (
                               <img src={c.cover_url} className="w-full h-full object-cover" alt=""/>
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-[12px] font-semibold text-white/50">
                                 {c.name.slice(0,2).toUpperCase()}
                               </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-medium text-white truncate flex items-center gap-1.5">
                              {c.name}
                              {c.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-white/50" />}
                            </p>
                            <p className="text-[11.5px] text-white/45 truncate mt-0.5">
                              {c.member_count} members · {c.category || 'general'}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/20" />
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* People Results */}
                  {results.people.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/40 border-t border-white/[0.04] pt-3">
                        People
                      </p>
                      {results.people.map((p) => (
                        <Link
                          key={p.id}
                          href={`/profile/${p.username}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                        >
                          <Avatar className="w-10 h-10 border border-white/[0.06]">
                            <AvatarImage src={p.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[11px] bg-white/[0.06] text-white/80">
                              {p.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-medium text-white truncate flex items-center gap-1.5">
                              {p.full_name}
                              {p.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-white/50" />}
                            </p>
                            <p className="text-[11.5px] text-white/45 truncate mt-0.5">
                              @{p.username} {p.tagline ? `· ${p.tagline}` : ''}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/20" />
                        </Link>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}