'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  // Update type icons
  ChatCircleDots, Package, Wrench, Flask, ChartLine, Bug,
  Megaphone, UsersThree, Notepad,
  // Meta / navigation
  Certificate, PushPin, MagnifyingGlass, ArrowLeft, CaretRight, CaretDown,
  List, X, Play, LinkSimple, ArrowSquareOut, PaperPlaneRight,
  // Actions
  Heart, ChatCircle, BookmarkSimple, ShareNetwork, DotsThree,
  Trash, PushPinSlash, Prohibit, Copy,
  // States
  CircleNotch, WarningCircle, House, LockKey,
} from '@phosphor-icons/react'

import { UpdateShareMenu } from './UpdateShareMenu'
import { UpdateDeleteModal } from './UpdateDeleteModal'
import { MediaLightbox } from './MediaLightbox'
import { DsrtButton, DsrtPanel } from '@/components/dsrt'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  updateId: string
  currentUserId: string | null
}

interface ImageObj {
  url: string
  alt?: string
}

interface Section {
  id: string
  text: string
  images: ImageObj[]
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

interface RailEntry {
  id: string
  title: string
  update_type: string
  release_label: 'none' | 'pre-release' | 'release'
  is_pinned: boolean
  created_at: string
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

interface ProjectInfo {
  id: string
  slug: string
  name: string
  logo_url: string | null
  is_owner: boolean
}

type ReaderState =
  | { status: 'loading' }
  | { status: 'ok'; update: Update }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }

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

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 60000))
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
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

function formatFullDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

/** Group rail entries by "Month YYYY" while preserving newest-first order */
function groupByMonth(entries: RailEntry[]): { key: string; label: string; items: RailEntry[] }[] {
  const groups = new Map<string, RailEntry[]>()
  for (const e of entries) {
    const d = new Date(e.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }
  return Array.from(groups.entries()).map(([key, items]) => {
    const d = new Date(items[0].created_at)
    return {
      key,
      label: d.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
      items,
    }
  })
}

/** Normalize section images: legacy string[] → { url }[] */
function normalizeSections(u: Update): Section[] {
  if (Array.isArray(u.sections) && u.sections.length > 0) {
    return u.sections.map((s: any, i: number) => ({
      id: s.id || `s-${i}`,
      text: s.text || '',
      images: Array.isArray(s.images)
        ? s.images.map((img: any) => typeof img === 'string' ? { url: img } : img).filter(Boolean)
        : [],
      video: s.video || null,
    }))
  }
  // Fallback for legacy updates
  const legacyImgs = Array.isArray(u.image_urls) ? u.image_urls.map(url => ({ url })) : []
  const legacyVids = Array.isArray(u.media_urls) ? u.media_urls : []
  if (!u.content && legacyImgs.length === 0 && legacyVids.length === 0) return []
  return [{
    id: 'legacy',
    text: u.content || '',
    images: legacyImgs,
    video: legacyVids[0] || null,
  }]
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function UpdateReader({ slug, updateId, currentUserId }: Props) {
  const router = useRouter()

  // ─── Reader state ────────────────────────────────────────────────────
  const [readerState, setReaderState] = useState<ReaderState>({ status: 'loading' })
  const [project, setProject] = useState<ProjectInfo | null>(null)

  // ─── Rail state ──────────────────────────────────────────────────────
  const [railEntries, setRailEntries] = useState<RailEntry[]>([])
  const [railLoading, setRailLoading] = useState(true)
  const [railQuery, setRailQuery] = useState('')

  // ─── Mobile drawer ──────────────────────────────────────────────────
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // ─── Modals ─────────────────────────────────────────────────────────
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ items: any[]; startIndex: number } | null>(null)

  // ─── Refs ───────────────────────────────────────────────────────────
  const isMountedRef = useRef(true)
  const activeRequestId = useRef(0)
  const rightPaneRef = useRef<HTMLDivElement>(null)

  // ═════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Body scroll lock when mobile drawer open
  useEffect(() => {
    if (mobileDrawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [mobileDrawerOpen])

  // ═════════════════════════════════════════════════════════════════════
  // FETCH: RAIL (list of all updates for this project)
  // ═════════════════════════════════════════════════════════════════════
  const fetchRail = useCallback(async () => {
    setRailLoading(true)
    try {
      const res = await fetch(`/api/projects/${slug}/updates?type=all&sort=newest&limit=50`, {
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!isMountedRef.current) return
      if (res.ok && Array.isArray(json.updates)) {
        setRailEntries(json.updates.map((u: any) => ({
          id: u.id,
          title: u.title || '',
          update_type: u.update_type || 'general',
          release_label: u.release_label || 'none',
          is_pinned: !!u.is_pinned,
          created_at: u.created_at,
        })))
      }
    } catch (e) {
      console.error('[UpdateReader] rail fetch failed:', e)
    } finally {
      if (isMountedRef.current) setRailLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchRail() }, [fetchRail])

  // ═════════════════════════════════════════════════════════════════════
  // FETCH: PROJECT INFO (for header + owner check)
  // ═════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false
    fetch(`/api/projects/${slug}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(json => {
        if (cancelled || !isMountedRef.current) return
        if (json?.project) {
          setProject({
            id: json.project.id,
            slug: json.project.slug,
            name: json.project.name,
            logo_url: json.project.logo_url,
            is_owner: !!json.is_owner,
          })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [slug])

  // ═════════════════════════════════════════════════════════════════════
  // FETCH: SINGLE UPDATE (right pane) — with race protection
  // ═════════════════════════════════════════════════════════════════════
  const fetchUpdate = useCallback(async () => {
    if (!updateId) return
    activeRequestId.current += 1
    const requestId = activeRequestId.current

    if (isMountedRef.current) setReaderState({ status: 'loading' })

    try {
      const res = await fetch(`/api/projects/${slug}/updates/${updateId}`, {
        cache: 'no-store',
      })

      if (requestId !== activeRequestId.current || !isMountedRef.current) return

      const json = await res.json().catch(() => ({}))

      if (res.status === 404) {
        setReaderState({ status: 'not_found' })
        return
      }
      if (res.status === 403 || json?.error === 'Forbidden') {
        setReaderState({ status: 'forbidden' })
        return
      }
      if (!res.ok || !json?.update) {
        setReaderState({
          status: 'error',
          message: json?.error || `Server returned ${res.status}`,
        })
        return
      }

      setReaderState({ status: 'ok', update: json.update })

      // Scroll right pane to top when switching updates
      if (rightPaneRef.current) {
        rightPaneRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e: any) {
      if (requestId === activeRequestId.current && isMountedRef.current) {
        setReaderState({ status: 'error', message: e?.message || 'Network error' })
      }
    }
  }, [slug, updateId])

  useEffect(() => { fetchUpdate() }, [fetchUpdate])

  // ═════════════════════════════════════════════════════════════════════
  // DERIVED: filtered rail
  // ═════════════════════════════════════════════════════════════════════
  const filteredRail = useMemo(() => {
    const q = railQuery.trim().toLowerCase()
    if (!q) return railEntries
    return railEntries.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      e.update_type.toLowerCase().includes(q)
    )
  }, [railEntries, railQuery])

  const groupedRail = useMemo(() => groupByMonth(filteredRail), [filteredRail])
  const pinnedRail = useMemo(() => railEntries.filter(e => e.is_pinned), [railEntries])

  // ═════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ═════════════════════════════════════════════════════════════════════

  const navigateToUpdate = useCallback((newId: string) => {
    if (newId === updateId) return
    setMobileDrawerOpen(false)
    router.replace(`/projects/${slug}/updates/${newId}`, { scroll: false })
  }, [slug, updateId, router])

  const toggleLike = useCallback(async () => {
    if (!currentUserId || readerState.status !== 'ok') {
      if (!currentUserId) toast.error('Sign in to like updates')
      return
    }
    const prev = readerState.update
    setReaderState({
      status: 'ok',
      update: {
        ...prev,
        user_liked: !prev.user_liked,
        like_count: prev.like_count + (prev.user_liked ? -1 : 1),
      },
    })
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${updateId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      if (isMountedRef.current) setReaderState({ status: 'ok', update: prev })
      toast.error('Could not update like')
    }
  }, [slug, updateId, currentUserId, readerState])

  const toggleBookmark = useCallback(async () => {
    if (!currentUserId || readerState.status !== 'ok') {
      if (!currentUserId) toast.error('Sign in to save updates')
      return
    }
    const prev = readerState.update
    setReaderState({
      status: 'ok',
      update: {
        ...prev,
        user_bookmarked: !prev.user_bookmarked,
        bookmark_count: prev.bookmark_count + (prev.user_bookmarked ? -1 : 1),
      },
    })
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${updateId}/bookmark`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      if (isMountedRef.current) setReaderState({ status: 'ok', update: prev })
      toast.error('Could not update bookmark')
    }
  }, [slug, updateId, currentUserId, readerState])

  const togglePin = useCallback(async () => {
    setMenuOpen(false)
    if (!project?.is_owner || readerState.status !== 'ok') return
    const prev = readerState.update
    const willPin = !prev.is_pinned
    setReaderState({
      status: 'ok',
      update: { ...prev, is_pinned: willPin, pinned_at: willPin ? new Date().toISOString() : null },
    })
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${updateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: willPin ? 'pin' : 'unpin' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (j?.code === 'pin_limit_reached') {
          throw new Error(j.error || 'Maximum 4 pinned updates. Unpin one first.')
        }
        throw new Error(j?.error || 'Failed to pin')
      }
      toast.success(willPin ? 'Pinned to top' : 'Unpinned')
      fetchRail()
    } catch (e: any) {
      if (isMountedRef.current) setReaderState({ status: 'ok', update: prev })
      toast.error(e?.message || 'Could not update pin')
    }
  }, [slug, updateId, project, readerState, fetchRail])

  const toggleComments = useCallback(async () => {
    setMenuOpen(false)
    if (!project?.is_owner || readerState.status !== 'ok') return
    const prev = readerState.update
    const willDisable = !prev.comments_disabled
    setReaderState({
      status: 'ok',
      update: { ...prev, comments_disabled: willDisable },
    })
    try {
      const res = await fetch(`/api/projects/${slug}/updates/${updateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments_disabled: willDisable }),
      })
      if (!res.ok) throw new Error()
      toast.success(willDisable ? 'Comments disabled' : 'Comments enabled')
    } catch {
      if (isMountedRef.current) setReaderState({ status: 'ok', update: prev })
      toast.error('Could not update comments setting')
    }
  }, [slug, updateId, project, readerState])

  const handleDeleted = useCallback(() => {
    setDeleteOpen(false)
    toast.success('Update deleted')
    // Navigate to next available update, or back to project
    const remaining = railEntries.filter(e => e.id !== updateId)
    if (remaining.length > 0) {
      router.replace(`/projects/${slug}/updates/${remaining[0].id}`)
    } else {
      router.replace(`/projects/${slug}?tab=updates`)
    }
  }, [slug, updateId, railEntries, router])

  const openLightbox = useCallback((sections: Section[], sectionIdx: number, mediaIdx: number) => {
    const flat: any[] = []
    let targetFlatIdx = 0
    sections.forEach((s, sIdx) => {
      const items: any[] = []
      if (s.video) items.push({ url: s.video, type: 'video' })
      s.images.forEach(img => items.push({ url: img.url, type: 'image', alt: img.alt }))
      items.forEach((item, iIdx) => {
        if (sIdx === sectionIdx && iIdx === mediaIdx) targetFlatIdx = flat.length
        flat.push(item)
      })
    })
    if (flat.length > 0) setLightbox({ items: flat, startIndex: targetFlatIdx })
  }, [])

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#05070D] text-white">
      {/* ─── TOP BAR (project context + mobile drawer trigger) ─────────── */}
      <div className="sticky top-0 z-30 bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Back to project */}
          <Link
            href={`/projects/${slug}?tab=updates`}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} weight="bold" />
            <span className="hidden sm:inline">Back to project</span>
          </Link>

          <div className="h-4 w-px bg-white/10" />

          {/* Project name + logo */}
          {project ? (
            <Link
              href={`/projects/${slug}`}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            >
              {project.logo_url ? (
                <img
                  src={project.logo_url}
                  alt=""
                  className="w-6 h-6 rounded-md object-cover border border-white/[0.1] shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-white/80">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-[13px] font-semibold text-white truncate">
                {project.name}
              </span>
              <span className="text-[11.5px] text-white/40 hidden sm:inline">/ Updates</span>
            </Link>
          ) : (
            <div className="h-6 w-40 bg-white/[0.05] rounded animate-pulse" />
          )}

          {/* Mobile drawer trigger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden ml-auto flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] transition-colors"
            aria-label="Open updates list"
          >
            <List size={14} weight="bold" />
            Updates
          </button>
        </div>
      </div>

      {/* ─── MAIN GRID ─────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* ─── LEFT RAIL (desktop) ──────────────────────────────────── */}
          <aside className="hidden lg:block">
            <RailPane
              entries={railEntries}
              filteredEntries={filteredRail}
              grouped={groupedRail}
              pinnedEntries={pinnedRail}
              query={railQuery}
              onQueryChange={setRailQuery}
              activeId={updateId}
              onSelect={navigateToUpdate}
              loading={railLoading}
              sticky
            />
          </aside>

          {/* ─── RIGHT PANE ───────────────────────────────────────────── */}
          <main ref={rightPaneRef} className="min-w-0">
            <RightPane
              state={readerState}
              slug={slug}
              currentUserId={currentUserId}
              project={project}
              menuOpen={menuOpen}
              onMenuToggle={() => setMenuOpen(v => !v)}
              onMenuClose={() => setMenuOpen(false)}
              onToggleLike={toggleLike}
              onToggleBookmark={toggleBookmark}
              onTogglePin={togglePin}
              onToggleComments={toggleComments}
              onOpenShare={(el) => setShareAnchor(el)}
              onOpenDelete={() => setDeleteOpen(true)}
              onOpenLightbox={openLightbox}
              onRetry={fetchUpdate}
            />
          </main>
        </div>
      </div>

      {/* ─── MOBILE DRAWER ────────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileDrawerOpen(false) }}
        >
          <div className="fixed inset-y-0 left-0 w-[80%] max-w-[340px] bg-[#0a0a0f] border-r border-white/[0.08] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
              <span className="text-[13.5px] font-bold text-white">All updates</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RailPane
                entries={railEntries}
                filteredEntries={filteredRail}
                grouped={groupedRail}
                pinnedEntries={pinnedRail}
                query={railQuery}
                onQueryChange={setRailQuery}
                activeId={updateId}
                onSelect={navigateToUpdate}
                loading={railLoading}
                sticky={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALS ───────────────────────────────────────────────────── */}
      {shareAnchor && readerState.status === 'ok' && (
        <UpdateShareMenu
          slug={slug}
          updateId={readerState.update.id}
          updateTitle={readerState.update.title}
          anchorEl={shareAnchor}
          onClose={() => setShareAnchor(null)}
        />
      )}

      {deleteOpen && readerState.status === 'ok' && (
        <UpdateDeleteModal
          slug={slug}
          updateId={readerState.update.id}
          updateTitle={readerState.update.title}
          updateAuthor={readerState.update.user?.full_name}
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleDeleted}
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
// RAIL PANE — searchable, grouped list of update titles
// ═══════════════════════════════════════════════════════════════════════════

function RailPane({
  entries, filteredEntries, grouped, pinnedEntries,
  query, onQueryChange, activeId, onSelect, loading, sticky,
}: {
  entries: RailEntry[]
  filteredEntries: RailEntry[]
  grouped: { key: string; label: string; items: RailEntry[] }[]
  pinnedEntries: RailEntry[]
  query: string
  onQueryChange: (q: string) => void
  activeId: string
  onSelect: (id: string) => void
  loading: boolean
  sticky: boolean
}) {
  return (
    <DsrtPanel
      padding="none"
      variant="default"
      className={
        'overflow-hidden flex flex-col ' +
        (sticky ? 'sticky top-[80px] max-h-[calc(100vh-100px)]' : 'h-full')
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <h3 className="text-[13px] font-bold text-white tracking-tight">
          All Updates
          {entries.length > 0 && (
            <span className="text-white/40 font-mono font-semibold ml-1.5 text-[11px]">
              {entries.length}
            </span>
          )}
        </h3>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-white/[0.05] flex-shrink-0">
        <div className="relative">
          <MagnifyingGlass
            size={12}
            weight="bold"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search updates..."
            className="w-full h-8 pl-7 pr-2.5 bg-white/[0.03] border border-white/[0.08] rounded-md text-[12px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.05] transition-colors"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded text-white/40 hover:text-white hover:bg-white/[0.05] flex items-center justify-center transition-colors"
              aria-label="Clear search"
            >
              <X size={10} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 bg-white/[0.03] rounded-md animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[12.5px] text-white/40">
              {query ? `No updates matching "${query}"` : 'No updates yet'}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {/* Pinned section (only when no query) */}
            {!query && pinnedEntries.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1.5 mb-0.5">
                  <PushPin size={10} weight="fill" className="text-[#38bdf8]" />
                  <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#38bdf8] font-bold">
                    Pinned
                  </span>
                </div>
                {pinnedEntries.map(entry => (
                  <RailItem
                    key={entry.id}
                    entry={entry}
                    active={entry.id === activeId}
                    onSelect={onSelect}
                  />
                ))}
                <div className="h-px bg-white/[0.06] my-3 mx-2" />
              </div>
            )}

            {/* Grouped by month */}
            {grouped.map(group => (
              <div key={group.key} className="mb-3 last:mb-0">
                <div className="px-2 py-1.5 mb-0.5">
                  <span className="text-[9.5px] font-mono uppercase tracking-widest text-white/35 font-bold">
                    {group.label}
                  </span>
                </div>
                {group.items
                  .filter(e => !e.is_pinned || query) // pinned shown separately when no query
                  .map(entry => (
                    <RailItem
                      key={entry.id}
                      entry={entry}
                      active={entry.id === activeId}
                      onSelect={onSelect}
                    />
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </DsrtPanel>
  )
}

function RailItem({
  entry, active, onSelect,
}: {
  entry: RailEntry
  active: boolean
  onSelect: (id: string) => void
}) {
  const typeCfg = UPDATE_TYPE_META[entry.update_type] || UPDATE_TYPE_META.general
  const TypeIcon = typeCfg.icon

  return (
    <button
      onClick={() => onSelect(entry.id)}
      className={
        'w-full text-left px-2.5 py-2 rounded-md transition-colors flex items-start gap-2 group ' +
        (active
          ? 'bg-white/[0.08] border border-white/[0.15]'
          : 'hover:bg-white/[0.03] border border-transparent')
      }
    >
      <TypeIcon
        size={12}
        weight="fill"
        className={active ? 'text-[#38bdf8] mt-0.5 shrink-0' : 'text-white/40 group-hover:text-white/70 mt-0.5 shrink-0'}
      />
      <div className="min-w-0 flex-1">
        <p
          className={
            'text-[12.5px] leading-snug truncate ' +
            (active ? 'font-bold text-white' : 'font-semibold text-white/75 group-hover:text-white')
          }
        >
          {entry.title || 'Untitled update'}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-white/40 truncate">
            {timeAgo(entry.created_at)}
          </span>
          {entry.release_label === 'release' && (
            <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" title="Release" />
          )}
          {entry.release_label === 'pre-release' && (
            <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" title="Pre-release" />
          )}
        </div>
      </div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// RIGHT PANE — full update renderer
// ═══════════════════════════════════════════════════════════════════════════

function RightPane({
  state, slug, currentUserId, project,
  menuOpen, onMenuToggle, onMenuClose,
  onToggleLike, onToggleBookmark, onTogglePin, onToggleComments,
  onOpenShare, onOpenDelete, onOpenLightbox, onRetry,
}: {
  state: ReaderState
  slug: string
  currentUserId: string | null
  project: ProjectInfo | null
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onToggleLike: () => void
  onToggleBookmark: () => void
  onTogglePin: () => void
  onToggleComments: () => void
  onOpenShare: (el: HTMLElement) => void
  onOpenDelete: () => void
  onOpenLightbox: (sections: Section[], sIdx: number, mIdx: number) => void
  onRetry: () => void
}) {
  if (state.status === 'loading') {
    return (
      <div className="space-y-4">
        <div className="h-8 w-2/3 bg-white/[0.05] rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-white/[0.04] rounded animate-pulse" />
        <div className="h-64 bg-white/[0.03] rounded-2xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/[0.04] rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-white/[0.04] rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (state.status === 'not_found') {
    return (
      <StatusPanel
        icon={<MagnifyingGlass size={28} className="text-white/50" />}
        title="Update not found"
        description="This update may have been deleted or you may have followed an outdated link."
        actions={
          <Link
            href={`/projects/${slug}?tab=updates`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] transition-colors"
          >
            <House size={13} weight="bold" /> All updates
          </Link>
        }
      />
    )
  }

  if (state.status === 'forbidden') {
    return (
      <StatusPanel
        icon={<LockKey size={28} weight="duotone" className="text-white/50" />}
        title="This update is private"
        description="You need to be a member of this project to view this update."
        actions={
          <Link
            href={`/projects/${slug}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] transition-colors"
          >
            <House size={13} weight="bold" /> Back to project
          </Link>
        }
      />
    )
  }

  if (state.status === 'error') {
    return (
      <StatusPanel
        icon={<WarningCircle size={28} weight="duotone" className="text-red-300" />}
        title="Could not load update"
        description={state.message}
        actions={
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] transition-colors"
          >
            Retry
          </button>
        }
      />
    )
  }

  const update = state.update
  const typeCfg = UPDATE_TYPE_META[update.update_type] || UPDATE_TYPE_META.general
  const TypeIcon = typeCfg.icon
  const sections = normalizeSections(update)
  const isOwner = project?.is_owner ?? false
  const isAuthor = currentUserId === update.user_id
  const canDelete = isAuthor || isOwner

  return (
    <article id={`update-${update.id}`} className="pb-16">
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-widest bg-white/[0.05] border border-white/[0.1] text-white/80">
            <TypeIcon size={11} weight="fill" /> {typeCfg.label}
          </span>
          {update.release_label === 'release' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-extrabold uppercase tracking-widest bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Package size={10} weight="fill" /> Release
            </span>
          )}
          {update.release_label === 'pre-release' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-extrabold uppercase tracking-widest bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <Flask size={10} weight="fill" /> Pre-release
            </span>
          )}
          {update.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-widest bg-[#38bdf8]/12 border border-[#38bdf8]/25 text-[#7dd3fc]">
              <PushPin size={10} weight="fill" /> Pinned
            </span>
          )}
        </div>

        {/* Title */}
        {update.title && (
          <h1 className="text-[28px] sm:text-[32px] font-extrabold text-white leading-tight tracking-tight mb-4">
            {update.title}
          </h1>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={`/profile/${update.user?.username || update.user_id}`}
            className="flex items-center gap-3 min-w-0 group"
          >
            {update.user?.avatar_url ? (
              <div className="w-11 h-11 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.1] shrink-0">
                <img src={update.user.avatar_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                <span className="text-[15px] font-bold text-white/80">
                  {(update.user?.full_name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14px] font-bold text-white group-hover:underline">
                  {update.user?.full_name || 'Unknown'}
                </span>
                {update.user?.is_verified && (
                  <Certificate size={13} weight="fill" className="text-[#93c5fd] shrink-0" />
                )}
                {update.author_role && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/70 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded ml-1">
                    {update.author_role}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-white/45 mt-0.5">
                {formatFullDate(update.created_at)}
                {update.edited_at && <span className="text-white/30"> · edited</span>}
              </div>
            </div>
          </Link>

          {/* Actions menu */}
          <div className="relative">
            <button
              onClick={onMenuToggle}
              aria-label="More actions"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
            >
              <DotsThree size={20} weight="bold" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={onMenuClose} />
                <div className="absolute right-0 top-10 z-40 min-w-[210px] bg-[#0d0d10] border border-white/[0.1] rounded-lg shadow-2xl py-1 overflow-hidden">
                  {isOwner && (
                    <MenuItem
                      icon={update.is_pinned ? PushPinSlash : PushPin}
                      onClick={onTogglePin}
                    >
                      {update.is_pinned ? 'Unpin from top' : 'Pin to top'}
                    </MenuItem>
                  )}
                  {isOwner && (
                    <MenuItem icon={Prohibit} onClick={onToggleComments}>
                      {update.comments_disabled ? 'Enable comments' : 'Disable comments'}
                    </MenuItem>
                  )}
                  <MenuItem
                    icon={Copy}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/projects/${slug}/updates/${update.id}`)
                        .then(() => toast.success('Link copied'))
                        .catch(() => toast.error('Copy failed'))
                      onMenuClose()
                    }}
                  >
                    Copy link
                  </MenuItem>
                  {canDelete && (
                    <>
                      <div className="h-px bg-white/[0.06] my-1" />
                      <MenuItem icon={Trash} onClick={() => { onMenuClose(); onOpenDelete() }} danger>
                        Delete update
                      </MenuItem>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── DIVIDER ────────────────────────────────────────────────── */}
      <div className="h-px bg-white/[0.08] mb-6" />

      {/* ─── SECTIONS ───────────────────────────────────────────────── */}
      {sections.length > 0 && (
        <div className="space-y-6 mb-8">
          {sections.map((s, sIdx) => (
            <SectionRenderer
              key={s.id}
              section={s}
              onOpenMedia={(mIdx) => onOpenLightbox(sections, sIdx, mIdx)}
            />
          ))}
        </div>
      )}

      {/* ─── LINK PILLS ─────────────────────────────────────────────── */}
      {Array.isArray(update.links) && update.links.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {update.links.map(l => (
            <a
              key={l.id || l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[12.5px] font-bold text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] hover:border-white/[0.25] px-4 py-2 rounded-lg transition-colors group max-w-full"
            >
              <LinkSimple size={12} weight="bold" className="text-[#38bdf8] shrink-0" />
              <span className="truncate max-w-[240px]">{l.title || l.url}</span>
              <ArrowSquareOut size={11} weight="bold" className="text-white/40 group-hover:text-white transition-colors shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* ─── TAGS ───────────────────────────────────────────────────── */}
      {Array.isArray(update.tags) && update.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {update.tags.map(t => (
            <span
              key={t}
              className="text-[11.5px] font-medium text-white/60 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* ─── ACTIONS BAR ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 pt-5 mb-6 border-t border-white/[0.06]">
        <ActionButton
          icon={Heart}
          active={!!update.user_liked}
          activeTone="text-red-400 bg-red-500/10 border border-red-500/20"
          count={update.like_count}
          onClick={onToggleLike}
          label="Like"
        />
        <ActionButton
          icon={BookmarkSimple}
          active={!!update.user_bookmarked}
          activeTone="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
          count={update.bookmark_count}
          onClick={onToggleBookmark}
          label="Save"
        />
        <ActionButton
          icon={ShareNetwork}
          active={false}
          count={0}
          onClick={(e) => onOpenShare(e.currentTarget as HTMLElement)}
          label="Share"
          hideCount
        />
      </div>

      {/* ─── COMMENTS ───────────────────────────────────────────────── */}
      {update.comments_disabled ? (
        <div className="text-[12.5px] text-white/40 text-center py-6 border border-white/[0.05] rounded-lg bg-white/[0.02]">
          Comments are disabled for this update
        </div>
      ) : (
        <CommentsSection
          slug={slug}
          postId={update.id}
          currentUserId={currentUserId}
        />
      )}
    </article>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION RENDERER (media grid + markdown body)
// ═══════════════════════════════════════════════════════════════════════════

function SectionRenderer({
  section, onOpenMedia,
}: {
  section: Section
  onOpenMedia: (mediaIdx: number) => void
}) {
  const hasMedia = section.images.length > 0 || !!section.video
  const hasText = section.text.trim().length > 0
  if (!hasMedia && !hasText) return null

  const mediaItems: Array<{ url: string; type: 'video' | 'image'; alt?: string }> = []
  if (section.video) mediaItems.push({ url: section.video, type: 'video' })
  section.images.forEach(img => mediaItems.push({ url: img.url, type: 'image', alt: img.alt }))

  if (!hasMedia && hasText) {
    return (
      <div className="prose prose-invert max-w-none text-[15px] text-white/85 leading-[1.75] prose-headings:text-white prose-a:text-[#93c5fd] prose-strong:text-white prose-code:text-[#c4b5fd] prose-code:bg-white/[0.06] prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.text}</ReactMarkdown>
      </div>
    )
  }

  if (hasMedia && !hasText) {
    return <MediaGrid items={mediaItems} onOpen={onOpenMedia} />
  }

  // Both media + text
  return (
    <div className="space-y-4">
      <MediaGrid items={mediaItems} onOpen={onOpenMedia} />
      <div className="prose prose-invert max-w-none text-[15px] text-white/85 leading-[1.75] prose-headings:text-white prose-a:text-[#93c5fd] prose-strong:text-white prose-code:text-[#c4b5fd] prose-code:bg-white/[0.06] prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.text}</ReactMarkdown>
      </div>
    </div>
  )
}

function MediaGrid({
  items, onOpen,
}: {
  items: Array<{ url: string; type: 'video' | 'image'; alt?: string }>
  onOpen: (idx: number) => void
}) {
  if (items.length === 0) return null

  if (items.length === 1) {
    const item = items[0]
    return (
      <button
        onClick={() => onOpen(0)}
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/[0.06] group"
      >
        {item.type === 'video' ? (
          <>
            <video src={item.url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play size={22} weight="fill" className="text-black ml-1" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={item.url}
            alt={item.alt || ''}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        )}
      </button>
    )
  }

  if (items.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-white/[0.06]">
        {items.map((item, i) => (
          <MediaTile key={i} item={item} onClick={() => onOpen(i)} />
        ))}
      </div>
    )
  }

  if (items.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1.5 aspect-video rounded-2xl overflow-hidden border border-white/[0.06]">
        <MediaTile item={items[0]} onClick={() => onOpen(0)} className="row-span-2" />
        <MediaTile item={items[1]} onClick={() => onOpen(1)} />
        <MediaTile item={items[2]} onClick={() => onOpen(2)} />
      </div>
    )
  }

  const displayed = items.slice(0, 4)
  const extra = items.length - 4
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-white/[0.06]">
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
  item: { url: string; type: 'video' | 'image'; alt?: string }
  onClick: () => void
  className?: string
  overlay?: string
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative aspect-square bg-black group overflow-hidden ' + className
      }
    >
      {item.type === 'video' ? (
        <>
          <video src={item.url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center">
              <Play size={17} weight="fill" className="text-black ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={item.url}
          alt={item.alt || ''}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <span className="text-white text-[22px] font-extrabold">{overlay}</span>
        </div>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMENTS SECTION
// ═══════════════════════════════════════════════════════════════════════════

function CommentsSection({
  slug, postId, currentUserId,
}: {
  slug: string
  postId: string
  currentUserId: string | null
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
      .then(j => { if (isMountedRef.current) setComments(j.comments || []) })
      .catch(() => { if (isMountedRef.current) setError('Failed to load') })
      .finally(() => { if (isMountedRef.current) setLoading(false) })
  }, [slug, postId])

  const submit = async () => {
    const content = text.trim()
    if (!content || posting) return
    setPosting(true); setError(null)
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
      }
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Could not post comment')
    } finally {
      if (isMountedRef.current) setPosting(false)
    }
  }

  return (
    <div>
      <h3 className="text-[13px] font-bold text-white/60 uppercase tracking-wider mb-4">
        Comments {comments.length > 0 && <span className="text-white/40 font-mono ml-1">({comments.length})</span>}
      </h3>

      {loading ? (
        <p className="text-[12.5px] text-white/40 flex items-center gap-1.5">
          <CircleNotch size={12} className="animate-spin" /> Loading comments...
        </p>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-4 mb-5">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {c.user?.avatar_url ? (
                      <img src={c.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11.5px] font-bold text-white/80">
                        {(c.user?.full_name || '?').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Link
                          href={`/profile/${c.user?.username || c.user_id}`}
                          className="text-[12.5px] font-bold text-white hover:underline"
                        >
                          {c.user?.full_name || 'Unknown'}
                        </Link>
                        {c.user?.is_verified && (
                          <Certificate size={9.5} weight="fill" className="text-[#93c5fd]" />
                        )}
                        <span className="text-[10.5px] text-white/40">· {timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">
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
                  className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-md h-10 px-3.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors disabled:opacity-60"
                />
                <button
                  onClick={submit}
                  disabled={posting || !text.trim()}
                  className="w-10 h-10 rounded-md bg-white text-black hover:bg-white/90 flex items-center justify-center disabled:opacity-40 transition-colors"
                  aria-label="Post comment"
                >
                  {posting ? (
                    <CircleNotch size={13} className="animate-spin" />
                  ) : (
                    <PaperPlaneRight size={13} weight="fill" />
                  )}
                </button>
              </div>
              {error && <p className="text-[11.5px] text-red-300 mt-2">{error}</p>}
            </>
          ) : (
            <p className="text-[12.5px] text-white/40 text-center py-3 border border-white/[0.05] rounded-md bg-white/[0.02]">
              Sign in to comment
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function ActionButton({
  icon: Icon, active, activeTone, count, onClick, label, hideCount,
}: {
  icon: any
  active: boolean
  activeTone?: string
  count: number
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  label: string
  hideCount?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        'flex items-center gap-1.5 px-3 h-10 rounded-lg text-[13px] font-bold transition-colors ' +
        (active
          ? (activeTone || 'text-white bg-white/[0.06]')
          : 'text-white/60 hover:text-white hover:bg-white/[0.04]')
      }
    >
      <Icon size={15} weight={active ? 'fill' : 'bold'} />
      {!hideCount && count > 0 && <span className="tabular-nums">{formatNum(count)}</span>}
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
        'w-full flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold transition-colors ' +
        (danger
          ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
          : 'text-white/80 hover:text-white hover:bg-white/[0.05]')
      }
    >
      <Icon size={14} weight="bold" />
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS PANEL
// ═══════════════════════════════════════════════════════════════════════════

function StatusPanel({
  icon, title, description, actions,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <DsrtPanel padding="lg" variant="default" className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
          {icon}
        </div>
        <h2 className="text-[17px] font-bold text-white mb-1.5">{title}</h2>
        {description && (
          <p className="text-[13px] text-white/55 leading-relaxed mb-5 max-w-sm mx-auto">
            {description}
          </p>
        )}
        {actions && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </DsrtPanel>
    </div>
  )
}