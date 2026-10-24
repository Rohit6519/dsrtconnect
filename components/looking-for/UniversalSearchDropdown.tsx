'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Briefcase, User as UserIcon, PuzzlePiece, Rocket,
  Sparkle, ArrowUpRight, CheckCircle, Compass,
} from '@phosphor-icons/react'
import { REQUEST_TYPE_LABELS } from '@/types/teamup'

interface SearchResults {
  query: string
  groups: {
    opportunities: any[]
    people: any[]
    projects: any[]
    ventures: any[]
    skills: any[]
  }
  total: number
}

interface Props {
  query: string
  open: boolean
  onClose: () => void
  onSelectSkill?: (skillName: string) => void
}

export function UniversalSearchDropdown({ query, open, onClose, onSelectSkill }: Props) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fetch results (debounced)
  useEffect(() => {
    if (!open || !query || query.length < 2) {
      setResults(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/looking-for/search?q=${encodeURIComponent(query)}&scope=all&limit=6`)
        const data = await res.json()
        if (!cancelled) setResults(data)
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open || !query || query.length < 2) return null

  const nothing =
    results &&
    !loading &&
    results.groups.opportunities.length === 0 &&
    results.groups.people.length === 0 &&
    results.groups.projects.length === 0 &&
    results.groups.ventures.length === 0 &&
    results.groups.skills.length === 0

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full mt-2 z-50 rounded-lg border border-zinc-800 bg-[#0a0a0a] shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
    >
      {loading && (
        <div className="px-4 py-3 text-[12px] text-zinc-500 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-zinc-500/30 border-t-zinc-300 animate-spin" />
          Searching DSRT...
        </div>
      )}

      {!loading && nothing && (
        <div className="px-4 py-6 text-center">
          <Compass size={18} className="text-zinc-500 mx-auto mb-2" />
          <div className="text-[13px] text-zinc-400">No results for "{query}"</div>
          <div className="text-[11.5px] text-zinc-500 mt-1">Try broader keywords or check spelling.</div>
        </div>
      )}

      {!loading && results && !nothing && (
        <div className="py-1">
          {/* Opportunities */}
          {results.groups.opportunities.length > 0 && (
            <SearchGroup label="Opportunities">
              {results.groups.opportunities.map((o: any) => (
                <Link
                  key={`${o.source_type}-${o.source_id}`}
                  href={`/looking-for/${o.source_id}?source=${o.source_type}`}
                  onClick={onClose}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-900/80 group"
                >
                  <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 mt-0.5">
                    <Briefcase size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-100 group-hover:text-white truncate">
                        {o.title}
                      </span>
                      {o.is_verified && <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                      <span className="uppercase tracking-wider">
                        {REQUEST_TYPE_LABELS[o.request_type] || o.request_type}
                      </span>
                      {o.venture?.name && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                          <span className="truncate">{o.venture.name}</span>
                        </>
                      )}
                      {o.project?.name && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                          <span className="truncate">{o.project.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight size={11} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 mt-1" />
                </Link>
              ))}
            </SearchGroup>
          )}

          {/* People */}
          {results.groups.people.length > 0 && (
            <SearchGroup label="People">
              {results.groups.people.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/profile/${p.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/80 group"
                >
                  {p.avatar_url ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                      <Image src={p.avatar_url} alt="" fill className="object-cover" sizes="32px" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[12px] text-zinc-400 shrink-0">
                      {p.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-zinc-100 truncate">{p.full_name}</span>
                      {p.is_verified && <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />}
                      {p.is_open_to_work && (
                        <span className="inline-flex items-center h-4 px-1 rounded text-[9px] font-medium uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Open
                        </span>
                      )}
                    </div>
                    {p.tagline && (
                      <div className="text-[11px] text-zinc-500 truncate">{p.tagline}</div>
                    )}
                  </div>
                </Link>
              ))}
            </SearchGroup>
          )}

          {/* Projects */}
          {results.groups.projects.length > 0 && (
            <SearchGroup label="Projects">
              {results.groups.projects.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/80 group"
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 relative">
                    {p.logo_url ? (
                      <Image src={p.logo_url} alt="" fill className="object-cover" sizes="32px" />
                    ) : p.icon ? (
                      <span className="text-[14px]">{p.icon}</span>
                    ) : (
                      <PuzzlePiece size={13} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-zinc-100 truncate">{p.name}</div>
                    {p.tagline && (
                      <div className="text-[11px] text-zinc-500 truncate">{p.tagline}</div>
                    )}
                  </div>
                </Link>
              ))}
            </SearchGroup>
          )}

          {/* Ventures */}
          {results.groups.ventures.length > 0 && (
            <SearchGroup label="Ventures">
              {results.groups.ventures.map((v: any) => (
                <Link
                  key={v.id}
                  href={`/ventures/${v.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/80 group"
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 relative">
                    {v.logo_url ? (
                      <Image src={v.logo_url} alt="" fill className="object-cover" sizes="32px" />
                    ) : (
                      <Rocket size={13} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-zinc-100 truncate">{v.name}</span>
                      {v.is_verified && <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />}
                    </div>
                    {v.tagline && (
                      <div className="text-[11px] text-zinc-500 truncate">{v.tagline}</div>
                    )}
                  </div>
                </Link>
              ))}
            </SearchGroup>
          )}

          {/* Skills — filter action */}
          {results.groups.skills.length > 0 && (
            <SearchGroup label="Skills — filter by">
              <div className="px-4 py-2 flex flex-wrap gap-1.5">
                {results.groups.skills.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectSkill?.(s.name)
                      onClose()
                    }}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                  >
                    <Sparkle size={9} weight="fill" className="text-blue-400" />
                    {s.name}
                  </button>
                ))}
              </div>
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  )
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800/60 last:border-b-0">
      <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}
