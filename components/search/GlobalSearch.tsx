'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MagnifyingGlass,
  X,
  Clock,
  TrendUp,
  User,
  Buildings,
  Folder,
  Article,
  Users,
  Briefcase,
  CheckCircle,
  ArrowRight,
} from '@phosphor-icons/react'

interface SearchResult {
  users?: any[]
  projects?: any[]
  ventures?: any[]
  posts?: any[]
  communities?: any[]
  intent?: { type: string; tags: string[] }
}

// Clean, standard, professional icons (no neon colors)
const ENTITY_QUICK_LINKS = [
  { icon: User, label: 'People', href: '/my-network' },
  { icon: Buildings, label: 'Ventures', href: '/ventures' },
  { icon: Folder, label: 'Projects', href: '/projects' },
  { icon: Article, label: 'Posts', href: '/home' },
  { icon: Users, label: 'Communities', href: '/community' },
  { icon: Briefcase, label: 'Opportunities', href: '/looking-for' },
]

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({})
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Dynamic trending topics from DB
  const [trendingTopics, setTrendingTopics] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dsrt_recent_searches')
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {
      /* ignore */
    }
  }, [])

  // Fetch actual trending tags from the database
  useEffect(() => {
    fetch('/api/home/trending/hashtags?limit=6')
      .then(res => res.json())
      .then(data => {
        if (data.hashtags) {
          setTrendingTopics(data.hashtags.map((h: any) => h.tag))
        }
      })
      .catch(() => {})
  }, [])

  // Keyboard shortcut Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setResults({})
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults({})
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data)
    } catch (e: any) {
      if (e?.name !== 'AbortError') setResults({})
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(query), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, performSearch])

  const saveRecentSearch = (q: string) => {
    if (!q.trim()) return
    const clean = q.trim()
    const updated = [clean, ...recentSearches.filter((s) => s !== clean)].slice(0, 8)
    setRecentSearches(updated)
    try { localStorage.setItem('dsrt_recent_searches', JSON.stringify(updated)) } catch {}
  }

  const removeRecentSearch = (s: string) => {
    const updated = recentSearches.filter((r) => r !== s)
    setRecentSearches(updated)
    try { localStorage.setItem('dsrt_recent_searches', JSON.stringify(updated)) } catch {}
  }

  const clearAllRecent = () => {
    setRecentSearches([])
    try { localStorage.removeItem('dsrt_recent_searches') } catch {}
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    saveRecentSearch(query)
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const totalResultCount =
    (results.users?.length || 0) +
    (results.projects?.length || 0) +
    (results.ventures?.length || 0) +
    (results.posts?.length || 0) +
    (results.communities?.length || 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          'w-full h-11 flex items-center gap-2.5 px-3.5 rounded-xl ' +
          'border border-zinc-800/80 ' +
          'bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 ' +
          'hover:from-zinc-900 hover:to-zinc-950 hover:border-zinc-700 ' +
          'text-[13.5px] text-zinc-500 hover:text-zinc-400 ' +
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_1px_2px_rgba(0,0,0,0.25)] ' +
          'transition-all'
        }
      >
        <MagnifyingGlass size={15} weight="regular" className="text-zinc-500 shrink-0" />
        <span className="flex-1 text-left truncate">
          Search DSRT Connect — people, ventures, posts...
        </span>
        <kbd
          className={
            'pointer-events-none inline-flex h-6 select-none items-center gap-0.5 ' +
            'rounded-md border border-zinc-800 bg-zinc-950/80 px-1.5 ' +
            'font-mono text-[10px] font-semibold text-zinc-500 ' +
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
          }
        >
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0b] shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="border-b border-zinc-800">
              <div className="flex items-center gap-3 px-5 py-4">
                <MagnifyingGlass size={20} className="text-zinc-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search anything on DSRT Connect..."
                  className="flex-1 bg-transparent text-[15px] text-white placeholder:text-zinc-600 focus:outline-none"
                />
                {loading && (
                  <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin shrink-0" />
                )}
                {query && !loading && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="hidden sm:flex text-[10px] font-mono font-semibold text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 h-5 rounded items-center"
                >
                  ESC
                </button>
              </div>
            </form>

            <div className="max-h-[60vh] overflow-y-auto">
              {!query.trim() ? (
                <div>
                  {/* RECENT SEARCHES */}
                  {recentSearches.length > 0 && (
                    <div className="p-3 border-b border-zinc-800/60">
                      <div className="flex items-center justify-between px-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-zinc-500" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            Recent
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={clearAllRecent}
                          className="text-[11px] text-zinc-500 hover:text-white transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {recentSearches.map((s) => (
                          <div
                            key={s}
                            className="group flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-zinc-900/60 cursor-pointer"
                            onClick={() => {
                              setQuery(s)
                              inputRef.current?.focus()
                            }}
                          >
                            <Clock size={12} className="text-zinc-600 shrink-0" />
                            <span className="flex-1 text-[13px] text-zinc-300 truncate">{s}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeRecentSearch(s)
                              }}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800"
                            >
                              <X size={11} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QUICK EXPLORE (Standardized Icons) */}
                  <div className="p-3 border-b border-zinc-800/60">
                    <div className="px-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Explore
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ENTITY_QUICK_LINKS.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="group flex flex-col items-center gap-2 py-3.5 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors"
                        >
                          <link.icon size={18} className="text-zinc-400 group-hover:text-white transition-colors" weight="regular" />
                          <span className="text-[11.5px] font-semibold text-zinc-300 group-hover:text-white transition-colors">
                            {link.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* TRENDING TOPICS (Synced with backend) */}
                  {trendingTopics.length > 0 && (
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 px-2 mb-2">
                        <TrendUp size={12} className="text-zinc-500" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Trending
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {trendingTopics.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              setQuery(topic)
                              inputRef.current?.focus()
                            }}
                            className="inline-flex items-center h-7 px-2.5 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-[11.5px] font-medium text-zinc-300 hover:text-white transition-colors"
                          >
                            #{topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {!loading && totalResultCount === 0 && query.trim().length >= 2 && (
                    <div className="p-8 text-center">
                      <MagnifyingGlass size={32} weight="regular" className="mx-auto mb-3 text-zinc-700" />
                      <p className="text-[14px] font-semibold text-white mb-1">No results found</p>
                      <button
                        type="button"
                        onClick={() => {
                          saveRecentSearch(query)
                          setOpen(false)
                          router.push(`/search?q=${encodeURIComponent(query.trim())}`)
                        }}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-400 hover:text-blue-300"
                      >
                        Search all of DSRT for &quot;{query}&quot;{' '}
                        <ArrowRight size={11} weight="bold" />
                      </button>
                    </div>
                  )}

                  {(results.users?.length || 0) > 0 && (
                    <ResultSection icon={User} label="People">
                      {results.users!.slice(0, 4).map((u) => (
                        <PersonResultRow
                          key={u.id}
                          user={u}
                          onClick={() => {
                            saveRecentSearch(query)
                            router.push(`/profile/${u.username}`)
                            setOpen(false)
                          }}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {(results.ventures?.length || 0) > 0 && (
                    <ResultSection icon={Buildings} label="Ventures">
                      {results.ventures!.slice(0, 4).map((v) => (
                        <VentureResultRow
                          key={v.id}
                          venture={v}
                          onClick={() => {
                            saveRecentSearch(query)
                            router.push(`/ventures/${v.slug}`)
                            setOpen(false)
                          }}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {(results.projects?.length || 0) > 0 && (
                    <ResultSection icon={Folder} label="Projects">
                      {results.projects!.slice(0, 4).map((p) => (
                        <ProjectResultRow
                          key={p.id}
                          project={p}
                          onClick={() => {
                            saveRecentSearch(query)
                            router.push(`/projects/${p.slug}`)
                            setOpen(false)
                          }}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {(results.communities?.length || 0) > 0 && (
                    <ResultSection icon={Users} label="Communities">
                      {results.communities!.slice(0, 3).map((c) => (
                        <CommunityResultRow
                          key={c.id}
                          community={c}
                          onClick={() => {
                            saveRecentSearch(query)
                            router.push(`/community/${c.slug}`)
                            setOpen(false)
                          }}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {(results.posts?.length || 0) > 0 && (
                    <ResultSection icon={Article} label="Posts">
                      {results.posts!.slice(0, 3).map((p) => (
                        <PostResultRow
                          key={p.id}
                          post={p}
                          onClick={() => {
                            saveRecentSearch(query)
                            router.push(`/posts/${p.id}`)
                            setOpen(false)
                          }}
                        />
                      ))}
                    </ResultSection>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ResultSection({
  icon: Icon,
  label,
  children,
}: {
  icon: any
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-zinc-800/60 last:border-b-0 pb-2">
      <div className="flex items-center gap-1.5 px-4 py-2.5">
        <Icon size={12} className="text-zinc-500" weight="regular" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      {children}
    </div>
  )
}

function PersonResultRow({ user, onClick }: { user: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900/60 cursor-pointer transition-colors"
    >
      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-zinc-500">
            {user.full_name?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-semibold text-white truncate">{user.full_name}</span>
          {user.is_verified && (
            <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />
          )}
        </div>
        <div className="text-[11px] text-zinc-500 truncate">
          @{user.username}
          {user.tagline ? ` · ${user.tagline}` : ''}
        </div>
      </div>
    </div>
  )
}

function VentureResultRow({ venture, onClick }: { venture: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900/60 cursor-pointer transition-colors"
    >
      <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
        {venture.logo_url ? (
          <img src={venture.logo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-zinc-500">
            {venture.name?.charAt(0) || 'V'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-semibold text-white truncate">{venture.name}</span>
          {venture.is_verified && (
            <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />
          )}
        </div>
        <div className="text-[11px] text-zinc-500 truncate">
          @{venture.slug}
          {venture.tagline ? ` · ${venture.tagline}` : ''}
        </div>
      </div>
    </div>
  )
}

function ProjectResultRow({ project, onClick }: { project: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900/60 cursor-pointer transition-colors"
    >
      <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
        {project.icon ? (
          <span className="text-sm">{project.icon}</span>
        ) : (
          <span className="text-[11px] font-bold text-zinc-500">
            {project.name?.charAt(0) || 'P'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold text-white truncate block">{project.name}</span>
        <div className="text-[11px] text-zinc-500 truncate">
          {project.sector ? `${project.sector} · ` : ''}
          {project.description}
        </div>
      </div>
    </div>
  )
}

function CommunityResultRow({ community, onClick }: { community: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900/60 cursor-pointer transition-colors"
    >
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
        {community.icon ? (
          <span className="text-sm">{community.icon}</span>
        ) : (
          <span className="text-[11px] font-bold text-zinc-500">
            {community.name?.charAt(0) || 'C'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-semibold text-white truncate">{community.name}</span>
          {community.is_verified && (
            <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />
          )}
        </div>
        <div className="text-[11px] text-zinc-500 truncate">
          {(community.member_count || 0).toLocaleString()} members
        </div>
      </div>
    </div>
  )
}

function PostResultRow({ post, onClick }: { post: any; onClick: () => void }) {
  return (
    <div onClick={onClick} className="px-4 py-2 hover:bg-zinc-900/60 cursor-pointer transition-colors">
      {post.title && (
        <div className="text-[13px] font-semibold text-white truncate mb-0.5">{post.title}</div>
      )}
      <p className="text-[12px] text-zinc-400 line-clamp-2 leading-snug">
        {post.content_text || post.content || 'No content'}
      </p>
    </div>
  )
}