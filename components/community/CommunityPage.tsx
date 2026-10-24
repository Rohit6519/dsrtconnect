'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  GlobeHemisphereWest, Buildings, UsersThree, Article, Rocket, Code,
  MagnifyingGlass, CalendarBlank, Lightbulb, Megaphone, Trophy,
  X, TrendUp, Lightning, Sparkle, Users, MapPin, ArrowRight,
  SquaresFour, List, CaretRight, Check, Heart, ChatCircle,
  ArrowsClockwise, CaretDown,
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { CATEGORIES, SKILLS, POST_TYPES, CONTENT_TABS, COMMUNITY_TABS } from '@/lib/config/community'

const ICON_MAP: Record<string, any> = {
  GlobeHemisphereWest, Buildings, UsersThree, Article, Rocket, Code,
  MagnifyingGlass, CalendarBlank, Lightbulb, Megaphone, Trophy,
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
}

// Session storage key for "how matching works" dismissal
const HOW_MATCHING_DISMISSED_KEY = 'dsrt_how_matching_dismissed'

// Session ID for tracking
const getSessionId = () => {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('dsrt_session_id')
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem('dsrt_session_id', sid)
  }
  return sid
}

interface CommunityPageProps {
  currentUser: any
  myCommunities: any[]
  goals: any[]
}

export function CommunityPage({ currentUser, myCommunities, goals }: CommunityPageProps) {
  const supabase = createClient()
  const router = useRouter()

  // ============================================
  // State
  // ============================================
  const [communityTab, setCommunityTab] = useState('global')
  const [contentTab, setContentTab] = useState('for_you')
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance')

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [goalFilter, setGoalFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [communityFilter, setCommunityFilter] = useState('')

  // Composer type
  const [composerType, setComposerType] = useState<string>('post')

  // How Matching Works dismissal
  const [showHowMatching, setShowHowMatching] = useState(true)

  // Sidebar data
  const [recommendedBuilders, setRecommendedBuilders] = useState<any[]>([])
  const [trendingSkills, setTrendingSkills] = useState<any[]>([])
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())

  // Communities for filter
  const [allCommunities, setAllCommunities] = useState<any[]>([])

  const sessionId = useMemo(() => getSessionId(), [])

  // ============================================
  // Init: check dismissal for "How Matching"
  // ============================================
  useEffect(() => {
    const dismissed = sessionStorage.getItem(HOW_MATCHING_DISMISSED_KEY)
    if (dismissed === '1') setShowHowMatching(false)
  }, [])

  const dismissHowMatching = () => {
    sessionStorage.setItem(HOW_MATCHING_DISMISSED_KEY, '1')
    setShowHowMatching(false)
  }

  // ============================================
  // Track activity (adaptive learning)
  // ============================================
  const track = useCallback((payload: {
    signal_type: string
    entity_type?: string
    entity_id?: string
    topics?: string[]
    dwell_ms?: number
    metadata?: any
  }) => {
    fetch('/api/community/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, session_id: sessionId }),
    }).catch(() => {})
  }, [sessionId])

  // ============================================
  // Load feed
  // ============================================
  const loadFeed = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        tab: contentTab,
        sort: sortBy,
        limit: '24',
        offset: currentOffset.toString(),
      })
      if (categoryFilter) params.set('category', categoryFilter)
      if (skillFilter) params.set('skill', skillFilter)
      if (goalFilter) params.set('goal', goalFilter)
      if (locationFilter) params.set('location', locationFilter)
      if (communityFilter) params.set('community', communityFilter)

      const res = await fetch(`/api/community/feed?${params}`)
      const data = await res.json()

      if (reset) {
        setPosts(data.posts || [])
        setOffset(24)
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])])
        setOffset(currentOffset + 24)
      }
      setHasMore(data.has_more)
    } catch {
      toast.error('Failed to load feed')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [contentTab, sortBy, categoryFilter, skillFilter, goalFilter, locationFilter, communityFilter, offset])

  // ============================================
  // Load sidebar & communities
  // ============================================
  const loadSidebar = useCallback(async () => {
    try {
      const [buildersRes, skillsRes, communitiesRes] = await Promise.all([
        fetch('/api/community/recommended'),
        fetch('/api/community/trending-skills'),
        fetch('/api/communities/list'),
      ])
      const buildersData = await buildersRes.json()
      const skillsData = await skillsRes.json()
      const communitiesData = await communitiesRes.json()

      setRecommendedBuilders(buildersData.builders || [])
      setTrendingSkills(skillsData.skills || [])
      setAllCommunities(communitiesData.communities || [])
    } catch {
      // silent
    }
  }, [])

  // ============================================
  // Effects
  // ============================================
  useEffect(() => {
    loadFeed(true)
    loadSidebar()

    // Auto-refresh sidebar every 3 minutes
    const interval = setInterval(loadSidebar, 3 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadFeed(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTab, sortBy, categoryFilter, skillFilter, goalFilter, locationFilter, communityFilter])

  // Real-time new posts
  useEffect(() => {
    const channel = supabase
      .channel('community-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'visibility=eq.global',
      }, async (payload) => {
        const newPost = payload.new as any
        if (newPost.user_id === currentUser.id) return

        const { data: user } = await supabase
          .from('users')
          .select('id, full_name, username, avatar_url, tagline, brings, location')
          .eq('id', newPost.user_id)
          .single()

        setPosts(prev => [{
          ...newPost,
          users: user,
          is_liked: false,
          is_bookmarked: false,
          relevance_score: 50,
        }, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id])

  // Real-time new communities (auto-add to filter)
  useEffect(() => {
    const channel = supabase
      .channel('communities-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communities',
      }, (payload) => {
        const newCommunity = payload.new as any
        setAllCommunities(prev => [
          { id: newCommunity.id, name: newCommunity.name, slug: newCommunity.slug, member_count: 0 },
          ...prev,
        ])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track filter changes as signals
  useEffect(() => {
    if (categoryFilter) track({ signal_type: 'filter_apply', metadata: { filter: 'category', value: categoryFilter }, topics: [categoryFilter] })
  }, [categoryFilter, track])
  useEffect(() => {
    if (skillFilter) track({ signal_type: 'filter_apply', metadata: { filter: 'skill', value: skillFilter }, topics: [skillFilter] })
  }, [skillFilter, track])
  useEffect(() => {
    if (communityFilter) track({ signal_type: 'click_community', entity_type: 'community', entity_id: communityFilter })
  }, [communityFilter, track])

  // ============================================
  // Handlers
  // ============================================
  const handleConnect = async (userId: string) => {
    if (connectedIds.has(userId)) return
    setConnectedIds(prev => new Set(prev).add(userId))

    track({ signal_type: 'connect_request', entity_type: 'user', entity_id: userId })

    const res = await fetch('/api/community/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: userId }),
    })

    if (res.ok) {
      toast.success('Connection request sent')
      setTimeout(() => setRecommendedBuilders(prev => prev.filter(b => b.id !== userId)), 800)
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to connect')
      setConnectedIds(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleAddPost = (newPost: any) => setPosts(prev => [newPost, ...prev])

  const resetFilters = () => {
    setCategoryFilter('')
    setSkillFilter('')
    setGoalFilter('')
    setLocationFilter('')
    setCommunityFilter('')
  }

  const hasActiveFilters = !!(categoryFilter || skillFilter || goalFilter || locationFilter || communityFilter)

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-4 md:p-6">
        {/* ==================== MAIN COLUMN ==================== */}
        <div className="space-y-4 min-w-0">
          {/* HERO BANNER */}
          <HeroBanner
            communityTab={communityTab}
            setCommunityTab={setCommunityTab}
            currentUser={currentUser}
          />

          {/* GLOBAL SEARCH */}
          <GlobalSearch onTrack={track} />

          {/* CREATE NEW COMPOSER (full width now) */}
          <Composer
            currentUser={currentUser}
            composerType={composerType}
            setComposerType={setComposerType}
            onPost={handleAddPost}
            onTrack={track}
          />

          {/* HOW MATCHING WORKS — dismissible */}
          <AnimatePresence>
            {showHowMatching && (
              <motion.div
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <HowMatchingWorks onDismiss={dismissHowMatching} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONTENT TABS + SORT (moved below HowMatching) */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 overflow-x-auto pb-1 flex-1 min-w-0 scrollbar-hide">
              {CONTENT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setContentTab(tab.id)
                    track({ signal_type: 'click_category', metadata: { tab: tab.id } })
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                    contentTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-muted/40 border rounded-md px-2 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="relevance">Sort by: Relevance</option>
                <option value="recent">Sort by: Recent</option>
                <option value="popular">Sort by: Popular</option>
              </select>
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-1.5', viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50')}
                >
                  <SquaresFour className="w-4 h-4" weight={viewMode === 'grid' ? 'fill' : 'regular'} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-1.5', viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50')}
                >
                  <List className="w-4 h-4" weight={viewMode === 'list' ? 'fill' : 'regular'} />
                </button>
              </div>
            </div>
          </div>

          {/* FILTER BAR */}
          <FilterBar
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            skillFilter={skillFilter} setSkillFilter={setSkillFilter}
            goalFilter={goalFilter} setGoalFilter={setGoalFilter}
            locationFilter={locationFilter} setLocationFilter={setLocationFilter}
            communityFilter={communityFilter} setCommunityFilter={setCommunityFilter}
            goals={goals}
            communities={allCommunities}
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
          />

          {/* FEED */}
          <div>
            {loading ? (
              <div className={cn('gap-3', viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3')}>
                {[1,2,3,4,5,6].map(i => <FeedCardSkeleton key={i} />)}
              </div>
            ) : posts.length === 0 ? (
              <EmptyFeed hasFilters={hasActiveFilters} onReset={resetFilters} />
            ) : (
              <>
                <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' : 'space-y-3')}>
                  {posts.map((post, idx) => (
                    <FeedCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      index={idx}
                      onTrack={track}
                    />
                  ))}
                </div>
                {hasMore && (
                  <button
                    onClick={() => loadFeed(false)}
                    disabled={loadingMore}
                    className="w-full mt-4 py-3 border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
                  >
                    {loadingMore ? (
                      <><ArrowsClockwise className="w-4 h-4 animate-spin" weight="bold" /> Loading...</>
                    ) : (
                      <>Load More <ArrowRight className="w-4 h-4" weight="bold" /></>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide pb-6">
            <AIMatchSidebar
              builders={recommendedBuilders}
              onConnect={handleConnect}
              connectedIds={connectedIds}
              onTrack={track}
            />
            <TrendingSkillsSidebar
                skills={trendingSkills}
                onSelect={(name: string) => {
                    setSkillFilter(name)
                    track({ signal_type: 'click_skill', topics: [name] })
                }}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

// ============================================
// HERO BANNER (with dsrt-community-banner.png)
// ============================================
function HeroBanner({ communityTab, setCommunityTab, currentUser }: any) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden relative">
      {/* Banner image area — you'll upload dsrt-community-banner.png to /public/ */}
      <div
        className="relative h-40 md:h-52 w-full bg-gradient-to-br from-orange-900 via-black to-blue-900"
        style={{
          backgroundImage: 'url(/dsrt-community-banner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
      </div>

      {/* Header + tabs */}
      <div className="p-5">
        <h1 className="text-2xl font-bold tracking-tight">Community</h1>
        <p className="text-sm text-muted-foreground mt-1">Three communities. Infinite opportunities.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {COMMUNITY_TABS.map(tab => {
            const Icon = ICON_MAP[tab.icon]
            const isOrg = tab.id === 'organization'
            return (
              <button
                key={tab.id}
                onClick={() => setCommunityTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  communityTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground'
                )}
              >
                {Icon && <Icon className="w-4 h-4" weight="fill" />}
                {tab.label}
                {isOrg && currentUser?.institution?.short_name && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold">
                    {currentUser.institution.short_name}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================
// GLOBAL SEARCH
// ============================================
function GlobalSearch({ onTrack }: { onTrack: (p: any) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/community/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (r: any) => {
    onTrack({
      signal_type: 'search',
      entity_type: r.result_type,
      entity_id: r.id,
      metadata: { query, chose: r.title },
    })
    setOpen(false)
    setQuery('')
    if (r.result_type === 'community') router.push(`/community/${r.slug}`)
    else if (r.result_type === 'project') router.push(`/projects/${r.slug}`)
    else if (r.result_type === 'venture') router.push(`/ventures/${r.slug}`)
  }

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { community: [], project: [], venture: [] }
    results.forEach(r => { if (g[r.result_type]) g[r.result_type].push(r) })
    return g
  }, [results])

  return (
    <div ref={ref} className="relative">
      <div className={cn(
        'flex items-center gap-2 bg-card border rounded-2xl px-4 py-2.5 transition-all',
        open && 'ring-2 ring-primary/40 border-primary'
      )}>
        <MagnifyingGlass className="w-4 h-4 text-muted-foreground flex-shrink-0" weight="bold" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search communities, projects, ventures across DSRT Connect..."
          className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }}>
            <X className="w-4 h-4 text-muted-foreground" weight="bold" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-2xl shadow-xl z-50 max-h-[70vh] overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-6 text-center">
              <ArrowsClockwise className="w-5 h-5 animate-spin mx-auto text-muted-foreground" weight="bold" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No results for &quot;{query}&quot;</div>
          ) : (
            <div className="overflow-y-auto">
              {(['community', 'project', 'venture'] as const).map(type => {
                if (grouped[type].length === 0) return null
                return (
                  <div key={type} className="border-b last:border-b-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-4 pt-3 pb-1">
                      {type === 'community' ? 'Communities' : type === 'project' ? 'Projects' : 'Ventures'}
                    </p>
                    {grouped[type].map(r => (
                      <button
                        key={`${r.result_type}-${r.id}`}
                        onClick={() => handleSelect(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {r.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">{r.title?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{r.title}</p>
                          {r.subtitle && <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>}
                        </div>
                        <CaretRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" weight="bold" />
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// COMPOSER (full width now)
// ============================================
function Composer({ currentUser, composerType, setComposerType, onPost, onTrack }: any) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [skills, setSkills] = useState('')
  const [location, setLocation] = useState('')
  const [posting, setPosting] = useState(false)

  const handleTypeClick = (typeId: string) => {
    setComposerType(typeId)
    setExpanded(true)
  }

  const handlePost = async () => {
    if (!content.trim()) { toast.error('Write something first'); return }
    setPosting(true)

    const tagsArr = tags.split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean).slice(0, 10)
    const skillsArr = skills.split(/[\s,]+/).map(s => s.trim()).filter(Boolean).slice(0, 10)

    const { data, error } = await supabase.from('posts').insert({
      user_id: currentUser.id,
      type: composerType === 'post' ? 'update' : composerType,
      post_category: composerType,
      title: title.trim() || null,
      content: content.trim(),
      tags: tagsArr,
      skills: skillsArr,
      location: location.trim() || null,
      visibility: 'global',
    }).select().single()

    setPosting(false)

    if (error) {
      toast.error('Failed to post: ' + error.message)
    } else {
      toast.success('Posted to community')
      onTrack({
        signal_type: 'create_post',
        entity_type: 'post',
        entity_id: data.id,
        topics: [...tagsArr, ...skillsArr],
      })
      onPost({
        ...data,
        users: {
          id: currentUser.id,
          full_name: currentUser.full_name,
          username: currentUser.username,
          avatar_url: currentUser.avatar_url,
          tagline: currentUser.tagline,
          brings: currentUser.brings,
          location: currentUser.location,
        },
        is_liked: false,
        is_bookmarked: false,
        relevance_score: 100,
      })
      setContent(''); setTitle(''); setTags(''); setSkills(''); setLocation('')
      setExpanded(false)
    }
  }

  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={currentUser?.avatar_url} />
          <AvatarFallback className="text-xs">{currentUser?.full_name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold">Create New</p>
          <p className="text-xs text-muted-foreground">What are you building or looking for?</p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pl-13 scrollbar-hide" style={{ paddingLeft: '3.25rem' }}>
        {POST_TYPES.map(type => {
          const Icon = ICON_MAP[type.icon]
          const colors = COLOR_MAP[type.color]
          const isActive = expanded && composerType === type.id
          return (
            <button
              key={type.id}
              onClick={() => handleTypeClick(type.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border',
                isActive
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : 'bg-muted/50 hover:bg-muted border-transparent'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" weight={isActive ? 'fill' : 'duotone'} />}
              {type.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
            style={{ paddingLeft: '3.25rem' }}
          >
            {(['project', 'venture', 'event', 'hackathon'].includes(composerType)) && (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title..."
                className="text-sm font-semibold"
                maxLength={120}
              />
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                composerType === 'looking_for' ? 'What are you looking for? (e.g., co-founder, developer, mentor...)' :
                composerType === 'project' ? 'Describe your project...' :
                composerType === 'venture' ? 'Describe your venture...' :
                composerType === 'event' ? 'Event details...' :
                'Share with the community...'
              }
              rows={3}
              autoFocus
              maxLength={2000}
              className="resize-none text-sm"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#tags, #topics" className="text-xs" />
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma-separated)" className="text-xs" />
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="text-xs" />
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] text-muted-foreground">{content.length}/2000</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
                <Button size="sm" onClick={handlePost} disabled={posting || !content.trim()}>
                  {posting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// HOW MATCHING WORKS (dismissible)
// ============================================
function HowMatchingWorks({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { title: 'Tell Us About You', desc: 'Share your skills, interests, and what you want to build or learn.', icon: Users, color: 'blue' },
    { title: 'AI Analyzes', desc: 'Our algorithm analyzes compatibility, skills, and goals.', icon: Sparkle, color: 'purple' },
    { title: 'Find Your Match', desc: 'Get matched with projects, ventures, and people.', icon: MagnifyingGlass, color: 'green' },
    { title: 'Build Together', desc: 'Collaborate, create, and make an impact.', icon: Rocket, color: 'orange' },
  ]

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl p-5 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" weight="bold" />
      </button>
      <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
        <Lightning className="w-4 h-4 text-yellow-500" weight="fill" />
        How Our Smart Matching Works
      </h3>
      <p className="text-[11px] text-muted-foreground mb-3">Our AI-powered algorithm connects you with the right people and opportunities.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((item, i) => {
          const Icon = item.icon
          const colors = COLOR_MAP[item.color]
          return (
            <div key={i} className="bg-card/60 backdrop-blur rounded-xl p-3 text-center relative">
              <div className={cn('w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-2', colors.bg)}>
                <Icon className={cn('w-4 h-4', colors.text)} weight="fill" />
              </div>
              <p className="text-[11px] font-bold">{item.title}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
              {i < 3 && <CaretRight className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 hidden md:block" weight="bold" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// FILTER BAR (with proper dropdowns)
// ============================================
function FilterBar({
  categoryFilter, setCategoryFilter,
  skillFilter, setSkillFilter,
  goalFilter, setGoalFilter,
  locationFilter, setLocationFilter,
  communityFilter, setCommunityFilter,
  goals, communities,
  hasActiveFilters, onReset,
}: any) {
  const communityOptions = useMemo(
    () => communities.map((c: any) => ({ value: c.id, label: c.name })),
    [communities]
  )

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
      <AutocompleteDropdown
        label="All Categories"
        value={categoryFilter}
        onChange={setCategoryFilter}
        options={(CATEGORIES as readonly string[]).map(c => ({ value: c, label: c }))}
      />
      <AutocompleteDropdown
        label="All Skills"
        value={skillFilter}
        onChange={setSkillFilter}
        options={(SKILLS as readonly string[]).map(s => ({ value: s, label: s }))}
      />
      <AutocompleteDropdown
        label="All Goals"
        value={goalFilter}
        onChange={setGoalFilter}
        options={goals.map((g: any) => ({ value: g.name, label: g.name }))}
      />
      <LocationSelect value={locationFilter} onChange={setLocationFilter} />
      <AutocompleteDropdown
        label="All Communities"
        value={communityFilter}
        onChange={setCommunityFilter}
        options={communityOptions}
        icon={<UsersThree className="w-3 h-3" weight="duotone" />}
      />
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="h-8 text-xs px-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/30 font-semibold hover:bg-red-500/20 whitespace-nowrap flex-shrink-0 flex items-center gap-1"
        >
          <X className="w-3 h-3" weight="bold" />
          Reset
        </button>
      )}
    </div>
  )
}

// ============================================
// AUTOCOMPLETE DROPDOWN (fixed scroll)
// ============================================
interface DropdownOption { value: string; label: string }

function AutocompleteDropdown({
  label, value, onChange, options, icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: DropdownOption[]
  icon?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 200)
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 200)
  }, [options, query])

  const selectedLabel = useMemo(
    () => options.find(o => o.value === value)?.label || value,
    [options, value]
  )

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-8 text-xs bg-muted/40 border rounded-lg px-2.5 flex items-center gap-1.5 min-w-[130px] max-w-[180px] hover:bg-muted/60 transition-colors',
          value && 'border-primary/50 text-primary'
        )}
      >
        {icon}
        <span className="truncate">{value ? selectedLabel : label}</span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="ml-auto flex-shrink-0"
          >
            <X className="w-3 h-3" weight="bold" />
          </span>
        ) : (
          <CaretDown className="w-3 h-3 ml-auto flex-shrink-0" weight="bold" />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden" style={{ maxHeight: '320px' }}>
          <div className="p-2 border-b flex-shrink-0">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full h-8 text-xs bg-muted/40 border rounded px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            <button
              onClick={() => { onChange(''); setOpen(false); setQuery('') }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between',
                !value && 'bg-primary/10 text-primary font-semibold'
              )}
            >
              {label}
              {!value && <Check className="w-3 h-3" weight="bold" />}
            </button>
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); setQuery('') }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between',
                    value === opt.value && 'bg-primary/10 text-primary font-semibold'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <Check className="w-3 h-3 flex-shrink-0" weight="bold" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// LOCATION SELECT
// ============================================
function LocationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.locations || [])
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-8 text-xs bg-muted/40 border rounded-lg px-2.5 flex items-center gap-1.5 min-w-[130px] hover:bg-muted/60 transition-colors',
          value && 'border-primary/50 text-primary'
        )}
      >
        <MapPin className="w-3 h-3" weight="duotone" />
        <span className="truncate">{value || 'Location'}</span>
        {value ? (
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onChange('') }} className="ml-auto">
            <X className="w-3 h-3" weight="bold" />
          </span>
        ) : (
          <CaretDown className="w-3 h-3 ml-auto" weight="bold" />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-card border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden" style={{ maxHeight: '320px' }}>
          <div className="p-2 border-b">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type city or country..."
              className="w-full h-8 text-xs bg-muted/40 border rounded px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            {query.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Start typing...</p>
            )}
            {results.map(loc => (
              <button
                key={loc.id}
                onClick={() => { onChange(loc.display || `${loc.city}, ${loc.country}`); setOpen(false); setQuery('') }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                {loc.display || `${loc.city}, ${loc.country}`}
              </button>
            ))}
            {query.length > 0 && results.length === 0 && (
              <button
                onClick={() => { onChange(query); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                Use &quot;{query}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// FEED CARD (with dwell tracking)
// ============================================
function FeedCard({ post, currentUser, index, onTrack }: any) {
  const supabase = createClient()
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(post.is_liked)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const cardRef = useRef<HTMLDivElement>(null)
  const hoverStartRef = useRef<number | null>(null)
  const viewedRef = useRef(false)

  const typeConfig = POST_TYPES.find(t => t.id === post.post_category) || POST_TYPES[0]
  const colors = COLOR_MAP[typeConfig.color]
  const user = post.users
  const allTags = [...(post.skills || []), ...(post.tags || [])].slice(0, 5)

  // Track when card comes into view (IntersectionObserver)
  useEffect(() => {
    if (!cardRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !viewedRef.current) {
            viewedRef.current = true
            onTrack({
              signal_type: 'view_post',
              entity_type: 'post',
              entity_id: post.id,
              topics: [...(post.tags || []), ...(post.skills || []), post.sector].filter(Boolean),
            })
          }
        })
      },
      { threshold: 0.5 }
    )
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  const handleMouseEnter = () => { hoverStartRef.current = Date.now() }
  const handleMouseLeave = () => {
    if (hoverStartRef.current) {
      const dwell = Date.now() - hoverStartRef.current
      if (dwell > 2000) {
        onTrack({
          signal_type: 'view_post_deep',
          entity_type: 'post',
          entity_id: post.id,
          dwell_ms: dwell,
          topics: [...(post.tags || []), ...(post.skills || []), post.sector].filter(Boolean),
        })
      }
      hoverStartRef.current = null
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setLikeCount((prev: number) => newLiked ? prev + 1 : prev - 1)

    if (newLiked) {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUser.id })
      onTrack({
        signal_type: 'like_post',
        entity_type: 'post',
        entity_id: post.id,
        topics: [...(post.tags || []), ...(post.skills || []), post.sector].filter(Boolean),
      })
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id)
    }
  }

  const handleCardClick = () => router.push(`/pulse/${post.id}`)

  const title = post.title || post.content?.split('\n')[0]?.slice(0, 80) || 'Untitled'
  const desc = post.title ? post.content?.slice(0, 140) : post.content?.split('\n').slice(1).join(' ')?.slice(0, 140) || ''

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="bg-card border rounded-2xl p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group relative flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider', colors.bg, colors.text)}>
          {typeConfig.label}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" weight="bold" />
      </div>

      <h3 className="font-bold text-sm leading-snug mb-1.5 line-clamp-2">{title}</h3>
      {desc && <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed flex-1">{desc}</p>}

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {allTags.slice(0, 4).map((tag: string) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-medium">{tag}</span>
          ))}
          {allTags.length > 4 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-medium">+{allTags.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${user?.username}`}
            onClick={(e) => { e.stopPropagation(); onTrack({ signal_type: 'click_profile', entity_type: 'user', entity_id: user?.id }) }}
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="text-[8px]">{user?.full_name?.[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <button
            onClick={handleLike}
            className={cn('flex items-center gap-1 text-[10px] transition-colors', isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500')}
          >
            <Heart className="w-3 h-3" weight={isLiked ? 'fill' : 'regular'} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          {(post.comment_count || 0) > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ChatCircle className="w-3 h-3" weight="regular" />
              {post.comment_count}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: false })}
        </span>
      </div>
    </motion.div>
  )
}

function FeedCardSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-4 animate-pulse h-52">
      <div className="h-4 bg-muted rounded w-16 mb-3" />
      <div className="h-4 bg-muted rounded w-4/5 mb-2" />
      <div className="h-3 bg-muted/60 rounded w-full mb-1.5" />
      <div className="h-3 bg-muted/60 rounded w-2/3 mb-4" />
      <div className="flex gap-1 mb-3">
        <div className="h-3 bg-muted rounded w-12" />
        <div className="h-3 bg-muted rounded w-16" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 border-t">
        <div className="w-6 h-6 bg-muted rounded-full" />
        <div className="h-2 bg-muted rounded w-10" />
      </div>
    </div>
  )
}

function EmptyFeed({ hasFilters, onReset }: any) {
  return (
    <div className="bg-card border rounded-2xl p-12 text-center">
      <GlobeHemisphereWest className="w-14 h-14 mx-auto text-muted-foreground/30 mb-3" weight="duotone" />
      <h3 className="font-bold">{hasFilters ? 'No matching posts' : 'No posts yet'}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {hasFilters ? 'Try clearing your filters' : 'Be the first to share something'}
      </p>
      {hasFilters && <Button variant="outline" size="sm" onClick={onReset} className="mt-4">Clear Filters</Button>}
    </div>
  )
}

// ============================================
// AI MATCH SIDEBAR
// ============================================
function AIMatchSidebar({ builders, onConnect, connectedIds, onTrack }: any) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-3.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkle className="w-3.5 h-3.5 text-purple-500" weight="fill" />
          <p className="text-xs uppercase tracking-wider font-bold">AI Match For You</p>
        </div>
        <Link href="/explore" className="text-xs text-blue-500 hover:underline">View All</Link>
      </div>
      {builders.length === 0 ? (
        <div className="p-6 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" weight="duotone" />
          <p className="text-xs text-muted-foreground">Complete your profile to see matches</p>
        </div>
      ) : (
        <div className="divide-y">
          {builders.slice(0, 5).map((builder: any, idx: number) => (
            <motion.div
              key={builder.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <Link
                  href={`/profile/${builder.username}`}
                  onClick={() => onTrack({ signal_type: 'click_profile', entity_type: 'user', entity_id: builder.id })}
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={builder.avatar_url} />
                    <AvatarFallback className="text-xs">{builder.full_name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <Link href={`/profile/${builder.username}`} className="text-xs font-bold truncate hover:underline">
                      {builder.full_name}
                    </Link>
                    <span className="text-[10px] text-green-500 font-bold flex-shrink-0">
                      {builder.match_score}% Match
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{builder.tagline || 'Builder'}</p>
                  {builder.location && (
                    <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" weight="duotone" />
                      {builder.location}
                    </p>
                  )}
                  {builder.top_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {builder.top_skills.slice(0, 3).map((skill: string) => (
                        <span key={skill} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant={connectedIds.has(builder.id) ? 'secondary' : 'default'}
                    disabled={connectedIds.has(builder.id)}
                    className="h-6 text-[10px] mt-2 px-3"
                    onClick={() => onConnect(builder.id)}
                  >
                    {connectedIds.has(builder.id) ? (
                      <><Check className="w-3 h-3 mr-1" weight="bold" /> Sent</>
                    ) : 'Connect'}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// TRENDING SKILLS SIDEBAR
// ============================================
function TrendingSkillsSidebar({
  skills,
  onSelect,
}: {
  skills: Array<{ name: string; count: number }>
  onSelect: (name: string) => void
}) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-3.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendUp className="w-3.5 h-3.5 text-orange-500" weight="fill" />
          <p className="text-xs uppercase tracking-wider font-bold">Trending Skills</p>
        </div>
      </div>
      <div className="p-3.5">
        {skills.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center">No trending skills yet</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 16).map((skill: any, i: number) => (
              <button
                key={i}
                onClick={() => onSelect(skill.name)}
                className="text-[11px] px-2.5 py-1 bg-muted rounded-lg font-medium hover:bg-muted/70 transition-colors"
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}