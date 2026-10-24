'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MagnifyingGlass, Plus, Command, CaretDown, BookmarkSimple,
  Users, Heart, Lightning, ArrowRight, Trophy, CheckCircle,
  Sparkle, X, Compass, EyeSlash, DotsThree, Funnel,
  Play, Pause, PencilSimple, Check, Buildings, ArrowUpRight,
  Eye, Rocket, CaretLeft, CaretRight
} from '@phosphor-icons/react'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ExploreProject {
  id: string; slug: string; name: string; tagline: string | null
  description: string | null; icon: string; color: string; stage: string
  cover_image_url: string | null; project_number: string
  category: string[]; tech_stack: string[]; sector: string | null
  team_size: number; open_roles: number; follower_count: number
  view_count: number; save_count: number; traction_score: number
  global_rank: number | null; is_dsrt_verified: boolean
  is_open_source: boolean; founder_verified: boolean
  founder_id: string | null; founder_name: string | null
  founder_username: string | null; founder_avatar: string | null
  founder_user_verified: boolean; personal_score?: number
  user_saved?: boolean
}

interface Preferences {
  preferred_categories: string[]
  preferred_community_ids: string[]
  discovery_ratio: number
}

interface Community {
  id: string; name: string; slug: string; member_count: number
}

const SORT_OPTIONS = [
  { id: 'recommended', label: 'For you' },
  { id: 'newest', label: 'Newest' },
  { id: 'most_viewed', label: 'Most viewed' },
  { id: 'trending', label: 'Trending' },
] as const

const STAGE_COLORS: Record<string, string> = {
  idea: 'bg-purple-500/80', planning: 'bg-blue-500/80', building: 'bg-cyan-500/80',
  prototype: 'bg-orange-500/80', alpha: 'bg-emerald-500/80', beta: 'bg-yellow-500/80',
  mvp: 'bg-green-500/80', launched: 'bg-red-500/80', scaling: 'bg-pink-500/80',
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'IDEA', planning: 'PLANNING', building: 'BUILDING', prototype: 'PROTOTYPE',
  alpha: 'ALPHA', beta: 'BETA', mvp: 'MVP', launched: 'LAUNCHED', scaling: 'SCALING',
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 60) return diff + 'm ago'
  const h = Math.floor(diff / 60)
  if (h < 24) return h + 'h ago'
  const days = Math.floor(h / 24)
  if (days < 7) return days + 'd ago'
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// ═══════════════════════════════════════════════════════════════
// BANNER CAROUSEL — 205px, progress bar, play/pause
// ═══════════════════════════════════════════════════════════════

function BannerCarousel() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  const [banners, setBanners] = useState<string[]>([])

  useEffect(() => {
    const checkBanners = async () => {
      const found: string[] = []
      for (let i = 1; i <= 5; i++) {
        try {
          const res = await fetch('/banners/explore-' + i + '.png', { method: 'HEAD' })
          if (res.ok) found.push('/banners/explore-' + i + '.png')
        } catch {}
      }
      if (found.length === 0) {
        found.push('gradient-1', 'gradient-2', 'gradient-3')
      }
      setBanners(found)
    }
    checkBanners()
  }, [])

  const total = banners.length

  useEffect(() => {
    if (!playing || total <= 1) {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
      return
    }

    setProgress(0)
    const duration = 8000
    const step = 50

    progressRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + (step / duration) * 100
        if (next >= 100) return 100
        return next
      })
    }, step)

    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % total)
      setProgress(0)
    }, duration)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [playing, total, index])

  if (total === 0) return null

  const current = banners[index]
  const isGradient = current?.startsWith('gradient')

  const gradients = [
    'from-purple-900/40 via-blue-900/20 to-transparent',
    'from-emerald-900/30 via-cyan-900/15 to-transparent',
    'from-orange-900/30 via-red-900/15 to-transparent',
  ]

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] mb-6" style={{ height: 205 }}>
      {isGradient ? (
        <div className={'w-full h-full bg-gradient-to-br ' + gradients[parseInt(current.split('-')[1]) - 1] + ' flex items-center justify-center'}>
          <div className="text-center">
            <Sparkle size={28} weight="fill" className="mx-auto mb-2 text-white/25" />
            <p className="text-[14px] text-white/50 font-semibold">Featured projects coming soon</p>
            <p className="text-[11px] text-white/35 mt-1">Admin can set banners via the featured_banners_config</p>
          </div>
        </div>
      ) : (
        <Image
          src={current}
          alt={'Featured banner ' + (index + 1)}
          fill
          className="object-cover"
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 1000px"
        />
      )}

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/30">
        <div
          className="h-full bg-white/80 transition-none"
          style={{ width: progress + '%' }}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
        <button
          onClick={() => setPlaying(!playing)}
          className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={10} weight="fill" /> : <Play size={10} weight="fill" />}
        </button>
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setProgress(0) }}
              className={
                (i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40') +
                ' h-1.5 rounded-full transition-all'
              }
            />
          ))}
        </div>
      )}

      {/* Prev/Next */}
      {total > 1 && (
        <>
          <button
            onClick={() => { setIndex(i => (i - 1 + total) % total); setProgress(0) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/70 opacity-0 hover:opacity-100 transition-all"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <button
            onClick={() => { setIndex(i => (i + 1) % total); setProgress(0) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/70 opacity-0 hover:opacity-100 transition-all"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPLORE VIEW
// ═══════════════════════════════════════════════════════════════

export function ExploreView() {
  const router = useRouter()
  const supabase = createClient()
  const observerRef = useRef<HTMLDivElement>(null)

  // Session ID for no-repeat tracking
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const existing = sessionStorage.getItem('dsrt_explore_session')
    if (existing) return existing
    const fresh = 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('dsrt_explore_session', fresh)
    return fresh
  })

  // Track helper
  const track = useCallback((action: string, entityType: string, entityId: string, extra: any = {}) => {
    fetch('/api/explore/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        entity_type: entityType,
        entity_id: entityId,
        session_id: sessionId,
        ...extra,
      }),
    }).catch(() => {})
  }, [sessionId])

  // State
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [allSectors, setAllSectors] = useState<any[]>([])
  const [userCommunities, setUserCommunities] = useState<Community[]>([])

  const [industry, setIndustry] = useState<string>('all')
  const [sort, setSort] = useState<string>('recommended')
  const [sortOpen, setSortOpen] = useState(false)

  const [items, setItems] = useState<ExploreProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  // Preferences editing
  const [editingCategories, setEditingCategories] = useState(false)
  const [catQuery, setCatQuery] = useState('')
  const [catResults, setCatResults] = useState<any[]>([])
  const [editingCommunities, setEditingCommunities] = useState(false)
  const [commQuery, setCommQuery] = useState('')
  const [commResults, setCommResults] = useState<any[]>([])

  // ─── Load preferences + sectors ───
  useEffect(() => {
    Promise.all([
      fetch('/api/explore/preferences').then(r => r.json()),
      fetch('/api/explore/industries').then(r => r.json()),
    ]).then(([prefsJson, indJson]) => {
      if (prefsJson.preferences) setPreferences(prefsJson.preferences)
      fetch('/api/explore/communities?limit=20').then(r => r.json()).then(j => {
        setUserCommunities(j.communities || [])
      })
    }).finally(() => setPrefsLoading(false))

    fetch('/api/sectors/search?limit=600').then(r => r.json()).then(j => {
      setAllSectors(j.sectors || [])
    })
  }, [])

  // ─── Fetch recommendations (70/30 split) ───
  const fetchItems = useCallback(async () => {
    setLoading(true)
    setOffset(0)
    try {
      const [prefRes, discoverRes] = await Promise.all([
        fetch('/api/explore/recommendations?industry=' + encodeURIComponent(industry === 'all' ? '' : industry) + '&sort=' + sort + '&limit=18&offset=0&session_id=' + encodeURIComponent(sessionId)).then(r => r.json()),
        sort === 'recommended'
          ? fetch('/api/explore/recommendations?sort=trending&limit=8&offset=' + Math.floor(Math.random() * 20)).then(r => r.json())
          : Promise.resolve({ results: [] }),
      ])

      const prefItems: ExploreProject[] = prefRes.results || []
      const discoverItems: ExploreProject[] = (discoverRes.results || []).filter(
        (d: any) => !prefItems.some(p => p.id === d.id)
      )

      const merged: ExploreProject[] = []
      let pi = 0, di = 0
      while (pi < prefItems.length || di < discoverItems.length) {
        const batch = Math.random() > 0.5 ? 3 : 2
        for (let i = 0; i < batch && pi < prefItems.length; i++) {
          merged.push(prefItems[pi++])
        }
        if (di < discoverItems.length) {
          merged.push(discoverItems[di++])
        }
      }

      setItems(merged)
      setHasMore(prefItems.length >= 18)
      setOffset(merged.length)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [industry, sort, sessionId])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Save state
  useEffect(() => {
    if (items.length === 0) return
    const ids = items.map(i => i.id).join(',')
    fetch('/api/explore/save?ids=' + ids).then(r => r.json()).then(d => setSavedIds(new Set(d.saved || []))).catch(() => {})
  }, [items])

  // Infinite scroll
  useEffect(() => {
    const el = observerRef.current
    if (!el || !hasMore || loading || loadingMore) return
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0]?.isIntersecting && !loadingMore && hasMore) {
        setLoadingMore(true)
        try {
          const res = await fetch('/api/explore/recommendations?industry=' + encodeURIComponent(industry === 'all' ? '' : industry) + '&sort=' + sort + '&limit=24&offset=' + offset + '&session_id=' + encodeURIComponent(sessionId))
          const j = await res.json()
          const newItems = j.results || []
          setItems(prev => [...prev, ...newItems])
          setOffset(prev => prev + newItems.length)
          setHasMore(newItems.length >= 24)
        } catch { }
        finally { setLoadingMore(false) }
      }
    }, { rootMargin: '400px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [industry, sort, offset, hasMore, loading, loadingMore, sessionId])

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); setSearchOpen(false); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/projects/search?q=' + encodeURIComponent(searchQuery))
        const json = await res.json()
        setSearchResults(json.results || [])
        setSearchOpen(true)
      } catch { setSearchResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery])

    // Category autocomplete — uses live API for reliable results
  useEffect(() => {
    if (catQuery.length < 1) { setCatResults([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        // Try live API first (always fresh)
        const res = await fetch('/api/sectors/search?q=' + encodeURIComponent(catQuery) + '&limit=15')
        const data = await res.json()
        if (cancelled) return
        
        const excludeSet = new Set((preferences?.preferred_categories || []).map((c: string) => c.toLowerCase()))
        const filtered = (data.sectors || [])
          .filter((s: any) => !excludeSet.has(s.name.toLowerCase()))
          .slice(0, 12)
        setCatResults(filtered)
      } catch {
        // Fallback to preloaded if API fails
        const q = catQuery.toLowerCase()
        const filtered = allSectors
          .filter(s => {
            const name = s.name.toLowerCase()
            if (q.length <= 2) return name.startsWith(q) || name.includes(' ' + q)
            return name.includes(q)
          })
          .filter(s => !(preferences?.preferred_categories || []).includes(s.name))
          .slice(0, 12)
        if (!cancelled) setCatResults(filtered)
      }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [catQuery, allSectors, preferences])

  // Community autocomplete
  useEffect(() => {
    if (commQuery.length < 1) { setCommResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/explore/communities?q=' + encodeURIComponent(commQuery))
        const json = await res.json()
        const existing = new Set(preferences?.preferred_community_ids || [])
        setCommResults((json.communities || []).filter((c: any) => !existing.has(c.id)))
      } catch { setCommResults([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [commQuery, preferences])

  // ─── Preference actions ───
  const addCategory = async (name: string) => {
    const current = preferences?.preferred_categories || []
    if (current.includes(name)) return
    const updated = [...current, name]
    setPreferences(prev => prev ? { ...prev, preferred_categories: updated } : prev)
    setCatQuery('')
    await fetch('/api/explore/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_categories: updated }),
    }).catch(() => {})
    fetchItems()
  }

  const removeCategory = async (name: string) => {
    const updated = (preferences?.preferred_categories || []).filter(c => c !== name)
    setPreferences(prev => prev ? { ...prev, preferred_categories: updated } : prev)
    await fetch('/api/explore/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_categories: updated }),
    }).catch(() => {})
    fetchItems()
  }

  const addCommunity = async (community: Community) => {
    const current = preferences?.preferred_community_ids || []
    if (current.includes(community.id)) return
    const updated = [...current, community.id]
    setPreferences(prev => prev ? { ...prev, preferred_community_ids: updated } : prev)
    setUserCommunities(prev => [...prev, community])
    setCommQuery('')
    await fetch('/api/explore/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_community_ids: updated }),
    }).catch(() => {})
  }

  const removeCommunity = async (communityId: string) => {
    const updated = (preferences?.preferred_community_ids || []).filter(c => c !== communityId)
    setPreferences(prev => prev ? { ...prev, preferred_community_ids: updated } : prev)
    setUserCommunities(prev => prev.filter(c => c.id !== communityId))
    await fetch('/api/explore/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferred_community_ids: updated }),
    }).catch(() => {})
  }

  const toggleSave = async (projectId: string) => {
    const wasSaved = savedIds.has(projectId)
    const newSet = new Set(savedIds)
    if (wasSaved) newSet.delete(projectId); else newSet.add(projectId)
    setSavedIds(newSet)
    try {
      await fetch('/api/explore/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })
    } catch { setSavedIds(new Set(savedIds)) }
  }

  const dismissProject = async (projectId: string) => {
    setItems(prev => prev.filter(p => p.id !== projectId))
    fetch('/api/explore/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    }).catch(() => {})
  }

  // Category pills from preferences
  const prefCategories = preferences?.preferred_categories || []
  const displayCategories = (() => {
    const userCats = prefCategories.slice(0, 8)
    const popularOthers = allSectors
      .filter(s => s.popular && !userCats.includes(s.name))
      .slice(0, 6)
      .map(s => s.name)
    return [...userCats, ...popularOthers].slice(0, 14)
  })()

  const prefCommunityIds = new Set(preferences?.preferred_community_ids || [])
  const displayCommunities = userCommunities.filter(c => prefCommunityIds.has(c.id))

  return (
    <div className="flex gap-6">
      {/* ═══ MAIN CONTENT (full width minus sidebar) ═══ */}
      <div className="flex-1 min-w-0">
        {/* Search bar */}
        <div className="relative mb-4">
          <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
          <Input
            id="explore-search"
            placeholder="Search projects, technologies, founders, domains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            className="pl-10 pr-14 h-11 bg-white/[0.03] border-white/[0.08] text-white text-[14px] placeholder:text-white/35 rounded-xl focus:ring-purple-500/30 focus:border-purple-500/40"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-white/35 bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5">
            <Command size={11} /><span className="text-[10px] font-mono">K</span>
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute z-50 top-12 left-0 right-0 bg-[#0f0f18] border border-white/[0.1] rounded-xl shadow-2xl max-h-[380px] overflow-y-auto">
              {searchResults.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] cursor-pointer border-b border-white/[0.04] last:border-0"
                  onClick={() => { router.push('/projects/' + r.slug); setSearchOpen(false); setSearchQuery('') }}>
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                    {r.cover_image_url ? <img src={r.cover_image_url} alt="" className="w-full h-full object-cover" /> : <span>{r.icon || '\u26A1'}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] text-white font-semibold truncate">{r.name}</p>
                    <p className="text-[11px] text-white/45 truncate">{r.project_number} · {r.tagline || 'No description'}</p>
                  </div>
                  <ArrowUpRight size={13} className="text-white/30" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          <button
            onClick={() => setIndustry('all')}
            className={
              'px-3 h-8 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ' +
              (industry === 'all' ? 'bg-white text-black' : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white')
            }
          >
            All
          </button>
          {displayCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setIndustry(cat)}
              className={
                'px-3 h-8 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ' +
                (industry === cat ? 'bg-white text-black font-semibold' : 'bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white')
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Banner carousel */}
        <BannerCarousel />

        {/* Sort header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white flex items-center gap-2">
            Recommended for you
            {items.length > 0 && <span className="text-[12px] text-white/40 font-normal">· {items.length}</span>}
          </h2>
          <div className="relative">
            <button onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 text-[12px] text-white/70 hover:text-white bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-lg px-3 h-8 font-medium transition-colors">
              Sort: <span className="text-white font-semibold">{SORT_OPTIONS.find(s => s.id === sort)?.label}</span>
              <CaretDown size={11} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                <div className="absolute z-40 top-10 right-0 w-[170px] bg-[#12121a] border border-white/[0.08] rounded-lg shadow-2xl py-1">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => { setSort(opt.id); setSortOpen(false) }}
                      className={'w-full text-left px-3 py-2 text-[12px] hover:bg-white/[0.05] ' + (sort === opt.id ? 'text-purple-400 font-semibold' : 'text-white/85')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[360px] rounded-xl bg-white/[0.03]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3"><Compass size={18} className="text-white/40" /></div>
            <p className="text-[14px] text-white/50 font-semibold">Nothing here yet</p>
            <p className="text-[12px] text-white/35 mt-1">Try selecting different categories in your preferences.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((p, idx) => (
                <ProjectExploreCard
                  key={p.id}
                  project={p}
                  saved={savedIds.has(p.id)}
                  onToggleSave={() => { toggleSave(p.id); track(savedIds.has(p.id) ? 'unsave' : 'save', 'project', p.id) }}
                  onDismiss={() => { dismissProject(p.id); track('dismiss', 'project', p.id) }}
                  onOpen={() => {
                    track('click', 'project', p.id, { scroll_position: idx })
                    router.push('/projects/' + p.slug)
                  }}
                />
              ))}
            </div>
            <div ref={observerRef} className="h-20 flex items-center justify-center mt-4">
              {loadingMore && (
                <div className="text-white/50 text-[12px] flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  Loading more...
                </div>
              )}
              {!hasMore && items.length > 0 && (
                <p className="text-white/30 text-[12px]">You have reached the end</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══ RIGHT SIDEBAR — Preferences ═══ */}
      <div className="w-[280px] flex-shrink-0 hidden xl:block space-y-4 sticky top-4 self-start max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide">

        {/* My Categories */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-[14px] font-semibold text-white">My Categories</h3>
            <button
              onClick={() => setEditingCategories(!editingCategories)}
              className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center"
            >
              <PencilSimple size={13} />
            </button>
          </div>

          <div className="p-3">
            {(preferences?.preferred_categories || []).length === 0 ? (
              <p className="text-[12px] text-white/40 py-2 text-center">No categories selected. Add some to personalize your feed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(preferences?.preferred_categories || []).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setIndustry(cat)}
                    className={
                      'text-[11.5px] font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1 ' +
                      (industry === cat
                        ? 'bg-white/[0.1] text-white border border-white/[0.2]'
                        : 'text-white/70 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-white')
                    }
                  >
                    {cat}
                    {editingCategories && (
                      <span
                        onClick={(e) => { e.stopPropagation(); removeCategory(cat) }}
                        className="text-white/40 hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <X size={9} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {editingCategories && (
              <div className="mt-2 relative">
                <input
                  value={catQuery}
                  onChange={(e) => setCatQuery(e.target.value)}
                  placeholder="Add a category..."
                  className="w-full h-8 bg-white/[0.04] border border-white/[0.1] rounded-md px-2.5 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
                />
                {catResults.length > 0 && (
                  <div className="absolute z-40 top-9 left-0 right-0 max-h-[200px] overflow-y-auto bg-[#12121a] border border-white/[0.1] rounded-lg shadow-2xl py-1">
                    {catResults.map(s => (
                      <button
                        key={s.id}
                        onClick={() => addCategory(s.name)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-white/85 hover:bg-white/[0.05] flex items-center justify-between"
                      >
                        <span>{s.name}</span>
                        <span className="text-[10px] text-white/35">{s.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* My Communities */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-[14px] font-semibold text-white">My Communities</h3>
            <button
              onClick={() => setEditingCommunities(!editingCommunities)}
              className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center"
            >
              <PencilSimple size={13} />
            </button>
          </div>

          <div className="p-3">
            {displayCommunities.length === 0 ? (
              <p className="text-[12px] text-white/40 py-2 text-center">No communities selected.</p>
            ) : (
              <div className="space-y-1">
                {displayCommunities.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Users size={10} className="text-white/50" />
                      </div>
                      <span className="text-[12px] text-white/85 truncate">{c.name}</span>
                    </div>
                    {editingCommunities && (
                      <button onClick={() => removeCommunity(c.id)} className="text-white/40 hover:text-red-400">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {editingCommunities && (
              <div className="mt-2 relative">
                <input
                  value={commQuery}
                  onChange={(e) => setCommQuery(e.target.value)}
                  placeholder="Add a community..."
                  className="w-full h-8 bg-white/[0.04] border border-white/[0.1] rounded-md px-2.5 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
                />
                {commResults.length > 0 && (
                  <div className="absolute z-40 top-9 left-0 right-0 max-h-[200px] overflow-y-auto bg-[#12121a] border border-white/[0.1] rounded-lg shadow-2xl py-1">
                    {commResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => addCommunity(c)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-white/85 hover:bg-white/[0.05] flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] text-white/40">{c.member_count} members</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Project */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
          <h3 className="text-[14px] font-bold text-white mb-1">Have an idea?</h3>
          <p className="text-[12px] text-white/55 leading-relaxed mb-3">
            Create your project, find the right builders and turn your idea into real-world impact.
          </p>
          <button
            onClick={() => router.push('/projects/new')}
            className="w-full flex items-center justify-center gap-1.5 bg-white text-black hover:bg-white/90 font-semibold text-[12px] h-9 rounded-lg transition-colors"
          >
            <Plus size={12} weight="bold" /> Create Project
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED PROJECT CARD
// ═══════════════════════════════════════════════════════════════

function ProjectExploreCard({ project, saved, onToggleSave, onDismiss, onOpen }: {
  project: ExploreProject; saved: boolean; onToggleSave: () => void; onDismiss: () => void; onOpen: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const stage = project.stage || 'building'
  const stageColor = STAGE_COLORS[stage] || 'bg-gray-500/80'
  const stageLabel = STAGE_LABELS[stage] || stage.toUpperCase()

  return (
    <div className="group relative bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] hover:border-white/[0.15] rounded-xl overflow-hidden cursor-pointer flex flex-col transition-all" onClick={onOpen}>
      {/* Cover */}
      <div className="relative h-[140px] overflow-hidden bg-gradient-to-br from-purple-500/15 to-blue-500/8">
        {project.cover_image_url ? (
          <img src={project.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-50">{project.icon || '\u26A1'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-3 left-3">
          <span className={'px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ' + stageColor}>{stageLabel}</span>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onToggleSave() }}
            className={'w-8 h-8 rounded-lg backdrop-blur-md border flex items-center justify-center transition-all ' +
              (saved ? 'bg-amber-500/25 border-amber-400/50 text-amber-300' : 'bg-black/50 border-white/10 text-white hover:bg-black/70')}
            aria-label={saved ? 'Unsave' : 'Save'}>
            <BookmarkSimple size={13} weight={saved ? 'fill' : 'regular'} />
          </button>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="w-8 h-8 rounded-lg backdrop-blur-md bg-black/50 border border-white/10 text-white hover:bg-black/70 flex items-center justify-center">
              <DotsThree size={14} weight="bold" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                <div className="absolute z-40 top-9 right-0 w-[150px] bg-[#12121a] border border-white/[0.08] rounded-lg shadow-2xl py-1">
                  <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDismiss() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/80 hover:bg-white/[0.05]">
                    <EyeSlash size={12} /> Not interested
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Founder in bottom of cover */}
        {project.founder_name && (
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-black/60 overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/20">
              {project.founder_avatar ? (
                <img src={project.founder_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-bold text-white">{project.founder_name.charAt(0)}</span>
              )}
            </div>
            <span className="text-[10px] text-white/80 font-medium">{project.founder_name}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-[15px] font-bold text-white leading-tight line-clamp-1 mb-1">{project.name}</h3>
        <p className="text-[12px] text-white/55 line-clamp-2 leading-relaxed mb-2 min-h-[32px]">
          {project.tagline || project.description || 'No description'}
        </p>
        <p className="text-[10px] text-white/35 font-mono mb-3">{project.project_number}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {project.founder_verified && (
            <span className="inline-flex items-center gap-0.5 bg-blue-500/10 border border-blue-500/25 px-1.5 py-0.5 rounded text-[9px] font-semibold text-blue-300">
              <CheckCircle size={8} weight="fill" /> Verified
            </span>
          )}
          {project.is_dsrt_verified && (
            <span className="inline-flex items-center gap-0.5 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded text-[9px] font-semibold text-purple-300">
              <CheckCircle size={8} weight="fill" /> DSRT
            </span>
          )}
          {project.is_open_source && (
            <span className="inline-flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-300">
              Open Source
            </span>
          )}
          {project.sector && (
            <span className="text-[9px] text-white/50 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 rounded">
              {project.sector}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-white/50 pb-3 border-b border-white/[0.05]">
          <span className="flex items-center gap-1"><Users size={11} weight="fill" /> {formatNumber(project.team_size || 1)}</span>
          <span className="flex items-center gap-1"><Heart size={11} weight="fill" /> {formatNumber(project.follower_count || 0)}</span>
          <span className="flex items-center gap-1"><Eye size={11} weight="fill" /> {formatNumber(project.view_count || 0)}</span>
          {project.open_roles > 0 && (
            <span className="flex items-center gap-1 text-orange-300 font-semibold ml-auto">
              <Lightning size={11} weight="fill" /> {project.open_roles}
            </span>
          )}
        </div>

        {/* Bottom: rank + view */}
        <div className="mt-auto flex items-center justify-between pt-3">
          {project.global_rank ? (
            <span className="flex items-center gap-1 text-[11px]">
              <Trophy size={11} weight="fill" className="text-yellow-400" />
              <span className="text-white font-bold">#{project.global_rank}</span>
              <span className="text-white/40">Global</span>
            </span>
          ) : <span />}
          <button onClick={(e) => { e.stopPropagation(); onOpen() }}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-white bg-white/[0.06] group-hover:bg-white group-hover:text-black px-2.5 h-7 rounded-md transition-colors">
            View <ArrowRight size={11} weight="bold" />
          </button>
        </div>

        {/* Create Project */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
          <h3 className="text-[14px] font-bold text-white mb-1">Have an idea?</h3>
          <p className="text-[12px] text-white/55 leading-relaxed mb-3">
            Create your project, find the right builders and turn your idea into real-world impact.
          </p>
          <button
            onClick={() => router.push('/projects/new')}
            className="w-full flex items-center justify-center gap-1.5 bg-white text-black hover:bg-white/90 font-semibold text-[12px] h-9 rounded-lg transition-colors"
          >
            <Plus size={12} weight="bold" /> Create Project
          </button>
        </div>
      </div>
    </div>
  )
}