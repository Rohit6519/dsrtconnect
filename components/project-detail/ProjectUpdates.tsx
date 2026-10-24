'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  // Actions
  Heart, ChatCircle, BookmarkSimple, ShareNetwork, DotsThree,
  PushPin, PushPinSlash, Trash, Prohibit, Copy, PaperPlaneRight, ArrowSquareOut,
  // Type icons (professional)
  ChatCircleDots, Package, Wrench, Flask, ChartLine, Bug, Megaphone, UsersThree, Notepad,
  // Meta
  Certificate, Play, LinkSimple, CircleNotch, WarningCircle, Plus,
} from '@phosphor-icons/react'

import { ProjectUpdateComposer } from './ProjectUpdateComposer'
import { MediaLightbox } from './MediaLightbox'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  projectId: string
  projectStage: string
  isOwner: boolean
  isMember: boolean
  currentUserId: string | null
  onUploadFile: (file: File, kind: 'update') => Promise<string | null>
}

interface Section {
  id: string
  text: string
  images: string[]
  video: string | null
}

interface UpdateLink {
  id?: string
  title: string
  url: string
}

interface Update {
  id: string
  user_id: string
  title: string | null
  content: string | null
  update_type: string
  release_label: 'none' | 'pre-release' | 'release'
  sections: Section[]
  links: UpdateLink[]
  tags: string[]
  media_urls: string[]
  image_urls: string[]
  like_count: number
  comment_count: number
  bookmark_count: number
  is_pinned: boolean
  pinned_at: string | null
  comments_disabled: boolean
  created_at: string
  edited_at: string | null
  user_liked?: boolean
  user_bookmarked?: boolean
  author_role?: string
  user: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    is_verified: boolean
  }
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  user: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    is_verified: boolean
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const UPDATE_TYPE_META: Record<string, { label: string; icon: any }> = {
  general:       { label: 'Update',        icon: ChatCircleDots },
  release:       { label: 'Release',       icon: Package },
  building:      { label: 'Building',      icon: Wrench },
  experiment:    { label: 'Experiment',    icon: Flask },
  progress:      { label: 'Progress',      icon: ChartLine },
  fix:           { label: 'Fix',           icon: Bug },
  announcement:  { label: 'Announcement',  icon: Megaphone },
  collaboration: { label: 'Collaboration', icon: UsersThree },
  insight:       { label: 'Insight',       icon: Notepad },
}

const FILTER_TABS = [
  { id: 'all',           label: 'All' },
  { id: 'release',       label: 'Releases' },
  { id: 'building',      label: 'Building' },
  { id: 'experiment',    label: 'Experiments' },
  { id: 'announcement',  label: 'Announcements' },
  { id: 'discussion',    label: 'Discussions' },
]

const SORT_OPTIONS = [
  { id: 'newest',         label: 'Newest' },
  { id: 'most_discussed', label: 'Most discussed' },
  { id: 'most_saved',     label: 'Most saved' },
]

const PAGE_SIZE = 20

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 60000))
  if (diff < 1)   return 'just now'
  if (diff < 60)  return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function normalizeSections(u: any): Section[] {
  // Prefer new sections field; fall back to legacy content + top-level images/videos
  if (Array.isArray(u.sections) && u.sections.length > 0) {
    return u.sections.map((s: any, i: number) => ({
      id: s.id || `legacy-${i}`,
      text: s.text || '',
      images: Array.isArray(s.images) ? s.images : [],
      video: s.video || null,
    }))
  }
  const legacyImgs = Array.isArray(u.image_urls) ? u.image_urls : []
  const legacyVids = Array.isArray(u.media_urls) ? u.media_urls : []
  const legacyText = u.content || ''
  if (!legacyText && legacyImgs.length === 0 && legacyVids.length === 0) return []
  return [{
    id: 'legacy',
    text: legacyText,
    images: legacyImgs,
    video: legacyVids[0] || null,
  }]
}

function normalizeLinks(u: any): UpdateLink[] {
  if (Array.isArray(u.links) && u.links.length > 0) {
    return u.links.map((l: any, i: number) => ({
      id: l.id || `l-${i}`,
      title: String(l.title || '').trim(),
      url: String(l.url || '').trim(),
    })).filter((l: UpdateLink) => l.url)
  }
  // Legacy single resource_url
  if (u.resource_url) {
    return [{
      id: 'legacy-resource',
      title: u.resource_label || 'View resource',
      url: u.resource_url,
    }]
  }
  return []
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ProjectUpdates({
  slug, projectId, projectStage, isOwner, isMember, currentUserId, onUploadFile,
}: Props) {
  const [updates, setUpdates] = useState<Update[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [composerOpen, setComposerOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ items: any[]; startIndex: number } | null>(null)

  const isMountedRef = useRef(true)
  const activeRequestId = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ═════════════════════════════════════════════════════════════════════
  // MOUNT
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ═════════════════════════════════════════════════════════════════════
  // FETCH (initial + on filter/sort change)
  // ═════════════════════════════════════════════════════════════════════
  const fetchUpdates = useCallback(async (append = false, offset = 0) => {
    const requestId = ++activeRequestId.current

    if (append) setLoadingMore(true)
    else { setLoading(true); setError(null) }

    try {
      const params = new URLSearchParams({
        type: filter,
        sort,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      const res = await fetch(`/api/projects/${slug}/updates?${params}`)
      const json = await res.json().catch(() => ({}))

      // Race guard
      if (requestId !== activeRequestId.current || !isMountedRef.current) return

      if (!res.ok) {
        setError(json?.error || 'Failed to load updates')
        return
      }

      const fresh = (json.updates || []) as any[]
      setUpdates(prev => append ? [...prev, ...fresh] : fresh)
      setHasMore(!!json.has_more)
    } catch (e: any) {
      if (requestId === activeRequestId.current && isMountedRef.current) {
        setError(e?.message || 'Network error')
      }
    } finally {
      if (requestId === activeRequestId.current && isMountedRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [slug, filter, sort])

  useEffect(() => {
    fetchUpdates(false, 0)
  }, [fetchUpdates])

  // ═════════════════════════════════════════════════════════════════════
  // INFINITE SCROLL
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return

    const el = sentinelRef.current
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
        fetchUpdates(true, updates.length)
      }
    }, { rootMargin: '200px' })

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [hasMore, loading, loadingMore, updates.length, fetchUpdates])

  // ═════════════════════════════════════════════════════════════════════
  // ACTIONS (optimistic)
  // ═════════════════════════════════════════════════════════════════════

  const toggleLike = useCallback(async (id: string) => {
    if (!currentUserId) {
      toast.error('Sign in to like updates')
      return
    }
    setUpdates(prev => prev.map(u => u.id === id ? {
      ...u,
      user_liked: !u.user_liked,
      like_count: u.like_count + (u.user_liked ? -1 : 1),
    } : u))
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      // Rollback
      setUpdates(prev => prev.map(u => u.id === id ? {
        ...u,
        user_liked: !u.user_liked,
        like_count: u.like_count + (u.user_liked ? -1 : 1),
      } : u))
      toast.error('Could not update like')
    }
  }, [slug, currentUserId])

  const toggleBookmark = useCallback(async (id: string) => {
    if (!currentUserId) {
      toast.error('Sign in to save updates')
      return
    }
    setUpdates(prev => prev.map(u => u.id === id ? {
      ...u,
      user_bookmarked: !u.user_bookmarked,
      bookmark_count: u.bookmark_count + (u.user_bookmarked ? -1 : 1),
    } : u))
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${id}/bookmark`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      setUpdates(prev => prev.map(u => u.id === id ? {
        ...u,
        user_bookmarked: !u.user_bookmarked,
        bookmark_count: u.bookmark_count + (u.user_bookmarked ? -1 : 1),
      } : u))
      toast.error('Could not update bookmark')
    }
  }, [slug, currentUserId])

  const togglePin = useCallback(async (id: string) => {
    setMenuOpenId(null)
    if (!isOwner) return
    const target = updates.find(u => u.id === id)
    if (!target) return
    const willPin = !target.is_pinned

    setUpdates(prev => prev.map(u => u.id === id ? {
      ...u,
      is_pinned: willPin,
      pinned_at: willPin ? new Date().toISOString() : null,
    } : u))

    try {
      const res = await fetch(`/api/projects/${slug}/updates/${id}/pin`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success(willPin ? 'Pinned to top' : 'Unpinned')
      // Re-fetch to get correct ordering
      fetchUpdates(false, 0)
    } catch {
      setUpdates(prev => prev.map(u => u.id === id ? {
        ...u,
        is_pinned: !willPin,
        pinned_at: !willPin ? new Date().toISOString() : null,
      } : u))
      toast.error('Could not update pin')
    }
  }, [slug, isOwner, updates, fetchUpdates])

  const deleteUpdate = useCallback(async (id: string) => {
    setMenuOpenId(null)
    if (!confirm('Delete this update? This cannot be undone.')) return
    const prev = updates
    setUpdates(prev => prev.filter(u => u.id !== id))
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Update deleted')
    } catch {
      setUpdates(prev)
      toast.error('Could not delete update')
    }
  }, [slug, updates])

  const toggleComments = useCallback(async (u: Update) => {
    setMenuOpenId(null)
    if (!isOwner) return
    const willDisable = !u.comments_disabled

    setUpdates(prev => prev.map(x => x.id === u.id ? { ...x, comments_disabled: willDisable } : x))

    try {
      const res = await fetch(`/api/projects/${slug}/updates/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments_disabled: willDisable }),
      })
      if (!res.ok) throw new Error()
      toast.success(willDisable ? 'Comments disabled' : 'Comments enabled')
    } catch {
      setUpdates(prev => prev.map(x => x.id === u.id ? { ...x, comments_disabled: !willDisable } : x))
      toast.error('Could not update comments setting')
    }
  }, [slug, isOwner])

  const shareUpdate = useCallback(async (u: Update) => {
    setMenuOpenId(null)
    const url = `${window.location.origin}/projects/${slug}#update-${u.id}`
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: u.title || 'Project update',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      }
    } catch (err: any) {
      // User cancelled share sheet — silent
      if (err?.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      } catch {
        toast.error('Could not copy link')
      }
    }
  }, [slug])

  const openLightbox = useCallback((sections: Section[], sectionIdx: number, mediaIdx: number) => {
    // Flatten all media across all sections in display order
    const flat: any[] = []
    let targetFlatIdx = 0
    sections.forEach((s, sIdx) => {
      const items: any[] = []
      if (s.video) items.push({ url: s.video, type: 'video' })
      s.images.forEach(url => items.push({ url, type: 'image' }))
      items.forEach((item, iIdx) => {
        if (sIdx === sectionIdx && iIdx === mediaIdx) {
          targetFlatIdx = flat.length
        }
        flat.push(item)
      })
    })
    if (flat.length === 0) return
    setLightbox({ items: flat, startIndex: targetFlatIdx })
  }, [])

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  const canCompose = isOwner || isMember

  return (
    <div className="mb-2">
      {/* ═════════════════════════════════════════════════════════════
          HEADER
          ═════════════════════════════════════════════════════════════ */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white leading-tight">Updates</h2>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            What the team is shipping and building
          </p>
        </div>
        {canCompose && (
          <button
            onClick={() => setComposerOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-md transition-colors"
          >
            <Plus size={13} weight="bold" /> Post update
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════
          FILTER + SORT BAR
          ═════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-3 mb-5 border-b border-white/[0.06]">
        <div className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(t => {
            const active = filter === t.id
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={
                  'px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 ' +
                  (active
                    ? 'text-white border-white'
                    : 'text-white/45 border-transparent hover:text-white/80')
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-[12px] text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.1] rounded-md px-2.5 py-1.5 outline-none focus:border-white/25 mb-2 cursor-pointer transition-colors [color-scheme:dark]"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.id} value={o.id} className="bg-[#12121a]">{o.label}</option>
          ))}
        </select>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          FEED STATES
          ═════════════════════════════════════════════════════════════ */}
      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <FeedError message={error} onRetry={() => fetchUpdates(false, 0)} />
      ) : updates.length === 0 ? (
        <FeedEmpty
          filter={filter}
          canCompose={canCompose}
          onCompose={() => setComposerOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {updates.map(u => (
            <UpdateCard
              key={u.id}
              update={u}
              currentUserId={currentUserId}
              isOwner={isOwner}
              slug={slug}
              menuOpen={menuOpenId === u.id}
              onMenuToggle={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
              onMenuClose={() => setMenuOpenId(null)}
              expandedComments={expandedCommentsId === u.id}
              onToggleComments={() => setExpandedCommentsId(expandedCommentsId === u.id ? null : u.id)}
              onLike={() => toggleLike(u.id)}
              onBookmark={() => toggleBookmark(u.id)}
              onShare={() => shareUpdate(u)}
              onPin={() => togglePin(u.id)}
              onDelete={() => deleteUpdate(u.id)}
              onToggleCommentsSetting={() => toggleComments(u)}
              onOpenLightbox={(sIdx, mIdx) => openLightbox(normalizeSections(u), sIdx, mIdx)}
            />
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="py-6 flex items-center justify-center">
              {loadingMore && (
                <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/40">
                  <CircleNotch size={12} className="animate-spin" /> Loading more...
                </span>
              )}
            </div>
          )}
          {!hasMore && updates.length > PAGE_SIZE - 1 && (
            <p className="text-center text-[11px] font-mono uppercase tracking-wider text-white/25 py-4">
              End of updates
            </p>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          MODALS
          ═════════════════════════════════════════════════════════════ */}
      {composerOpen && (
        <ProjectUpdateComposer
          slug={slug}
          currentStage={projectStage}
          onClose={() => setComposerOpen(false)}
          onPosted={() => fetchUpdates(false, 0)}
          onUploadImage={onUploadFile}
          onUploadAttachment={async () => null}
        />
      )}

      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE CARD
// ═══════════════════════════════════════════════════════════════════════════

function UpdateCard({
  update: u,
  currentUserId,
  isOwner,
  slug,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  expandedComments,
  onToggleComments,
  onLike,
  onBookmark,
  onShare,
  onPin,
  onDelete,
  onToggleCommentsSetting,
  onOpenLightbox,
}: {
  update: Update
  currentUserId: string | null
  isOwner: boolean
  slug: string
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  expandedComments: boolean
  onToggleComments: () => void
  onLike: () => void
  onBookmark: () => void
  onShare: () => void
  onPin: () => void
  onDelete: () => void
  onToggleCommentsSetting: () => void
  onOpenLightbox: (sectionIdx: number, mediaIdx: number) => void
}) {
  const typeCfg = UPDATE_TYPE_META[u.update_type] || UPDATE_TYPE_META.general
  const TypeIcon = typeCfg.icon

  const sections = useMemo(() => normalizeSections(u), [u])
  const links = useMemo(() => normalizeLinks(u), [u])

  const isAuthor = currentUserId === u.user_id
  const canDelete = isAuthor || isOwner
  const canPin = isOwner

  return (
    <article
      id={`update-${u.id}`}
      className={
        'bg-white/[0.03] border rounded-2xl overflow-hidden transition-colors ' +
        (u.is_pinned
          ? 'border-white/[0.15] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'
          : 'border-white/[0.08]')
      }
    >
      <div className="p-5 sm:p-6">

        {/* ── HEADER ROW ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Author */}
          <Link
            href={`/profile/${u.user?.username || u.user_id}`}
            className="flex items-center gap-3 min-w-0 group"
          >
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {u.user?.avatar_url ? (
                <img src={u.user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[13px] font-semibold text-white/80">
                  {(u.user?.full_name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[13.5px] font-semibold text-white truncate group-hover:underline">
                  {u.user?.full_name || 'Unknown'}
                </p>
                {u.user?.is_verified && (
                  <Certificate size={12} weight="fill" className="text-[#93c5fd] shrink-0" />
                )}
                {u.author_role && (
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-white/70 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded">
                    {u.author_role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11.5px] text-white/45 mt-0.5">
                <span>{timeAgo(u.created_at)}</span>
                {u.edited_at && <span className="text-white/30">· edited</span>}
                {u.is_pinned && (
                  <span className="inline-flex items-center gap-0.5 text-white/60 font-medium">
                    · <PushPin size={9} weight="fill" /> Pinned
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Menu */}
          {(canDelete || canPin || isOwner) && (
            <div className="relative shrink-0">
              <button
                onClick={onMenuToggle}
                aria-label="More actions"
                aria-expanded={menuOpen}
                className="w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
              >
                <DotsThree size={18} weight="bold" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={onMenuClose}
                  />
                  <div className="absolute right-0 top-9 z-40 min-w-[190px] bg-[#0f0f18] border border-white/[0.1] rounded-lg shadow-2xl py-1 overflow-hidden">
                    {canPin && (
                      <MenuItem
                        icon={u.is_pinned ? PushPinSlash : PushPin}
                        onClick={onPin}
                      >
                        {u.is_pinned ? 'Unpin from top' : 'Pin to top'}
                      </MenuItem>
                    )}
                    {isOwner && (
                      <MenuItem
                        icon={Prohibit}
                        onClick={onToggleCommentsSetting}
                      >
                        {u.comments_disabled ? 'Enable comments' : 'Disable comments'}
                      </MenuItem>
                    )}
                    <MenuItem icon={Copy} onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/projects/${slug}#update-${u.id}`).then(
                        () => toast.success('Link copied'),
                        () => toast.error('Copy failed')
                      )
                      onMenuClose()
                    }}>
                      Copy link
                    </MenuItem>
                    {canDelete && (
                      <>
                        <div className="h-px bg-white/[0.06] my-1" />
                        <MenuItem icon={Trash} onClick={onDelete} danger>
                          Delete update
                        </MenuItem>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── TYPE + RELEASE BADGES ─────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold uppercase tracking-wider border bg-white/[0.05] border-white/[0.1] text-white/80">
            <TypeIcon size={11} weight="fill" /> {typeCfg.label}
          </span>
          {u.release_label === 'release' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-emerald-500/12 border border-emerald-500/25 text-emerald-300">
              <Package size={10} weight="fill" /> Release
            </span>
          )}
          {u.release_label === 'pre-release' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-amber-500/12 border border-amber-500/25 text-amber-300">
              Pre-release
            </span>
          )}
        </div>

        {/* ── TITLE ──────────────────────────────────────────────── */}
        {u.title && (
          <h3 className="text-[19px] sm:text-[20px] font-bold text-white leading-tight tracking-tight mb-4">
            {u.title}
          </h3>
        )}

        {/* ── SECTIONS ───────────────────────────────────────────── */}
        {sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((s, sIdx) => (
              <SectionRenderer
                key={s.id}
                section={s}
                onOpenMedia={(mIdx) => onOpenLightbox(sIdx, mIdx)}
              />
            ))}
          </div>
        )}

        {/* ── LINK PILLS ─────────────────────────────────────────── */}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {links.map(l => (
              <a
                key={l.id || l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] hover:border-white/[0.2] px-3 py-1.5 rounded-md transition-colors group max-w-full"
              >
                <LinkSimple size={11} weight="bold" className="shrink-0" />
                <span className="truncate">{l.title || l.url}</span>
                <ArrowSquareOut size={10} className="text-white/50 group-hover:text-white transition-colors shrink-0" />
              </a>
            ))}
          </div>
        )}

        {/* ── TAGS ───────────────────────────────────────────────── */}
        {u.tags && u.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {u.tags.map(t => (
              <span
                key={t}
                className="text-[11px] text-white/60 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* ── ACTIONS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mt-5 pt-4 border-t border-white/[0.05]">
          <ActionButton
            icon={Heart}
            active={!!u.user_liked}
            activeColor="text-red-400"
            activeBg="bg-red-500/10"
            count={u.like_count}
            onClick={onLike}
            label="Like"
          />
          {!u.comments_disabled && (
            <ActionButton
              icon={ChatCircle}
              active={expandedComments}
              activeColor="text-white"
              activeBg="bg-white/[0.06]"
              count={u.comment_count}
              onClick={onToggleComments}
              label="Comment"
            />
          )}
          <ActionButton
            icon={BookmarkSimple}
            active={!!u.user_bookmarked}
            activeColor="text-yellow-400"
            activeBg="bg-yellow-500/10"
            count={u.bookmark_count}
            onClick={onBookmark}
            label="Save"
          />
          <ActionButton
            icon={ShareNetwork}
            active={false}
            activeColor="text-white"
            activeBg="bg-white/[0.06]"
            count={0}
            onClick={onShare}
            label="Share"
            hideCount
          />
        </div>

        {/* ── COMMENTS PANEL ─────────────────────────────────────── */}
        {expandedComments && !u.comments_disabled && (
          <CommentsPanel
            slug={slug}
            postId={u.id}
            currentUserId={currentUserId}
            onCountChange={(delta) => {
              // Optimistic count update handled by parent state — future enhancement
            }}
          />
        )}

        {u.comments_disabled && (
          <p className="text-[11.5px] text-white/35 text-center pt-4 mt-4 border-t border-white/[0.05]">
            Comments are disabled for this update
          </p>
        )}
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function SectionRenderer({
  section, onOpenMedia,
}: {
  section: Section
  onOpenMedia: (mediaIdx: number) => void
}) {
  const hasMedia = section.images.length > 0 || section.video
  const hasText = section.text.trim().length > 0

  if (!hasMedia && !hasText) return null

  // Build media list in the same order as lightbox flat index
  const mediaItems: Array<{ url: string; type: 'video' | 'image' }> = []
  if (section.video) mediaItems.push({ url: section.video, type: 'video' })
  section.images.forEach(url => mediaItems.push({ url, type: 'image' }))

  // Solo text
  if (!hasMedia && hasText) {
    return (
      <div className="prose prose-invert prose-sm max-w-none text-[14px] text-white/85 leading-relaxed prose-headings:text-white prose-a:text-[#93c5fd] prose-strong:text-white prose-code:text-[#c4b5fd] prose-code:bg-white/[0.06] prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.text}</ReactMarkdown>
      </div>
    )
  }

  // Solo media
  if (hasMedia && !hasText) {
    return <MediaGrid items={mediaItems} onOpen={onOpenMedia} />
  }

  // Media + text side-by-side on desktop, stacked on mobile
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl overflow-hidden bg-black/[0.15] border border-white/[0.04]">
      <div className="p-2">
        <MediaGrid items={mediaItems} onOpen={onOpenMedia} />
      </div>
      <div className="p-4 sm:p-5 prose prose-invert prose-sm max-w-none text-[14px] text-white/85 leading-relaxed prose-headings:text-white prose-a:text-[#93c5fd] prose-strong:text-white prose-code:text-[#c4b5fd] prose-code:bg-white/[0.06] prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.text}</ReactMarkdown>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA GRID
// ═══════════════════════════════════════════════════════════════════════════

function MediaGrid({
  items, onOpen,
}: {
  items: Array<{ url: string; type: 'video' | 'image' }>
  onOpen: (mediaIdx: number) => void
}) {
  if (items.length === 0) return null

  // 1 item = full width
  if (items.length === 1) {
    const item = items[0]
    return (
      <button
        onClick={() => onOpen(0)}
        className="relative w-full aspect-video rounded-lg overflow-hidden bg-black border border-white/[0.06] group"
      >
        {item.type === 'video' ? (
          <>
            <video src={item.url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                <Play size={22} weight="fill" className="text-black ml-1" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={item.url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        )}
      </button>
    )
  }

  // 2 items
  if (items.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item, i) => (
          <MediaTile key={i} item={item} onClick={() => onOpen(i)} />
        ))}
      </div>
    )
  }

  // 3 items = 1 big left, 2 stacked right
  if (items.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1.5 aspect-video">
        <MediaTile item={items[0]} onClick={() => onOpen(0)} className="row-span-2" />
        <MediaTile item={items[1]} onClick={() => onOpen(1)} />
        <MediaTile item={items[2]} onClick={() => onOpen(2)} />
      </div>
    )
  }

  // 4+ items = 2x2 grid with +N overlay on last if needed
  const displayed = items.slice(0, 4)
  const extra = items.length - 4
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {displayed.map((item, i) => (
        <MediaTile
          key={i}
          item={item}
          onClick={() => onOpen(i)}
          overlay={i === 3 && extra > 0 ? `+${extra}` : undefined}
        />
      ))}
    </div>
  )
}

function MediaTile({
  item, onClick, className = '', overlay,
}: {
  item: { url: string; type: 'video' | 'image' }
  onClick: () => void
  className?: string
  overlay?: string
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative aspect-square rounded-lg overflow-hidden bg-black border border-white/[0.06] group ' +
        className
      }
    >
      {item.type === 'video' ? (
        <>
          <video src={item.url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center">
              <Play size={16} weight="fill" className="text-black ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={item.url}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <span className="text-white text-[22px] font-bold">{overlay}</span>
        </div>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function ActionButton({
  icon: Icon, active, activeColor, activeBg, count, onClick, label, hideCount,
}: {
  icon: any
  active: boolean
  activeColor: string
  activeBg: string
  count: number
  onClick: () => void
  label: string
  hideCount?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        'flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[12.5px] font-medium transition-colors ' +
        (active
          ? `${activeColor} ${activeBg} hover:opacity-90`
          : 'text-white/55 hover:text-white hover:bg-white/[0.04]')
      }
    >
      <Icon size={14} weight={active ? 'fill' : 'regular'} />
      {!hideCount && count > 0 && <span className="tabular-nums">{formatNum(count)}</span>}
      {!hideCount && count === 0 && <span className="sr-only">{label}</span>}
      {hideCount && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU ITEM
// ═══════════════════════════════════════════════════════════════════════════

function MenuItem({
  icon: Icon, onClick, children, danger,
}: {
  icon: any
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors ' +
        (danger
          ? 'text-red-300 hover:bg-red-500/10'
          : 'text-white/80 hover:text-white hover:bg-white/[0.05]')
      }
    >
      <Icon size={13} />
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMENTS PANEL
// ═══════════════════════════════════════════════════════════════════════════

function CommentsPanel({
  slug, postId, currentUserId, onCountChange,
}: {
  slug: string
  postId: string
  currentUserId: string | null
  onCountChange: (delta: number) => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    fetch(`/api/projects/${slug}/updates/${postId}/comments`)
      .then(r => r.json())
      .then(j => {
        if (isMountedRef.current) setComments(j.comments || [])
      })
      .catch(() => {
        if (isMountedRef.current) setError('Failed to load comments')
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false)
      })
  }, [slug, postId])

  const submit = async () => {
    const content = text.trim()
    if (!content || posting) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed')
      if (isMountedRef.current) {
        setComments(prev => [...prev, json.comment])
        setText('')
        onCountChange(+1)
      }
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Could not post comment')
    } finally {
      if (isMountedRef.current) setPosting(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.05]">
      {loading ? (
        <p className="text-[12px] text-white/40 flex items-center gap-1.5">
          <CircleNotch size={11} className="animate-spin" /> Loading comments...
        </p>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {c.user?.avatar_url ? (
                      <img src={c.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-semibold text-white/80">
                        {(c.user?.full_name || '?').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Link
                          href={`/profile/${c.user?.username || c.user_id}`}
                          className="text-[12px] font-semibold text-white hover:underline"
                        >
                          {c.user?.full_name || 'Unknown'}
                        </Link>
                        {c.user?.is_verified && (
                          <Certificate size={9} weight="fill" className="text-[#93c5fd]" />
                        )}
                        <span className="text-[10.5px] text-white/40">· {timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-white/85 leading-snug whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentUserId ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  }}
                  placeholder="Add a comment..."
                  disabled={posting}
                  className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-md h-9 px-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors disabled:opacity-60"
                />
                <button
                  onClick={submit}
                  disabled={posting || !text.trim()}
                  className="w-9 h-9 rounded-md bg-white text-black hover:bg-white/90 flex items-center justify-center disabled:opacity-40 transition-colors"
                  aria-label="Post comment"
                >
                  {posting ? (
                    <CircleNotch size={12} className="animate-spin" />
                  ) : (
                    <PaperPlaneRight size={12} weight="fill" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-[11.5px] text-red-300 mt-1.5">{error}</p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-white/40 text-center">
              Sign in to comment
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FEED STATES
// ═══════════════════════════════════════════════════════════════════════════

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-white/[0.06] rounded" />
              <div className="h-2.5 w-16 bg-white/[0.04] rounded" />
            </div>
          </div>
          <div className="h-5 w-2/3 bg-white/[0.06] rounded mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-white/[0.04] rounded" />
            <div className="h-3 w-4/5 bg-white/[0.04] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500/[0.05] border border-red-500/20 rounded-2xl p-8 text-center">
      <WarningCircle size={28} weight="duotone" className="mx-auto mb-3 text-red-300" />
      <p className="text-[14px] font-semibold text-white mb-1">Could not load updates</p>
      <p className="text-[12.5px] text-white/50 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="text-[12.5px] font-semibold bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] text-white px-4 h-8 rounded-md transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

function FeedEmpty({
  filter, canCompose, onCompose,
}: {
  filter: string
  canCompose: boolean
  onCompose: () => void
}) {
  const isFiltered = filter !== 'all'
  const filterMeta = FILTER_TABS.find(t => t.id === filter)

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-12 text-center">
      <ChatCircleDots size={32} className="mx-auto mb-3 text-white/25" />
      {isFiltered ? (
        <>
          <p className="text-[14px] font-medium text-white/60 mb-1">
            No {filterMeta?.label.toLowerCase()} yet
          </p>
          <p className="text-[12px] text-white/35">
            Try a different filter or check back later.
          </p>
        </>
      ) : (
        <>
          <p className="text-[14px] font-medium text-white/60 mb-1">No updates yet</p>
          <p className="text-[12px] text-white/35 mb-4">
            {canCompose
              ? 'Post your first update to share progress.'
              : 'The team hasn\'t shared anything yet.'}
          </p>
          {canCompose && (
            <button
              onClick={onCompose}
              className="text-[12.5px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-8 rounded-md inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus size={11} weight="bold" /> Post first update
            </button>
          )}
        </>
      )}
    </div>
  )
}