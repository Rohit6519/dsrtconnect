'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  // Type icons (filled, professional)
  ChatCircleDots, Package, Wrench, Flask, ChartLine, Bug,
  Megaphone, UsersThree, Notepad,
  // Meta & actions
  Certificate, PushPin, ArrowRight, ArrowLeft,
  CaretRight, Plus, BookmarkSimple, ShareNetwork,
  CircleNotch, WarningCircle,
} from '@phosphor-icons/react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  projectId: string
  isOwner: boolean
  isMember: boolean
  currentUserId: string | null
  onOpenComposer?: () => void
  onSwitchToUpdatesTab?: () => void
}

interface UpdatePreview {
  id: string
  title: string | null
  content: string | null
  sections: any[]
  update_type: string
  release_label: 'none' | 'pre-release' | 'release'
  tags: string[]
  is_pinned: boolean
  like_count: number
  comment_count: number
  bookmark_count: number
  created_at: string
  edited_at: string | null
  user_id: string
  user: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    is_verified: boolean
  }
  author_role?: string
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

const PREVIEW_LIMIT = 12

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 60000))
  if (diff < 1) return 'now'
  if (diff < 60) return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/**
 * Extract a 2-line preview snippet from either the new sections[] format
 * or legacy content. Strips markdown syntax for cleaner display.
 */
function extractExcerpt(update: UpdatePreview): string {
  // Prefer first section text
  const firstSection = Array.isArray(update.sections) && update.sections.length > 0
    ? update.sections[0]
    : null

  let raw = ''
  if (firstSection?.text) raw = String(firstSection.text)
  else if (update.content) raw = String(update.content)
  else return ''

  // Strip common markdown syntax
  return raw
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`[^`]+`/g, '')         // Inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links → keep text
    .replace(/[#*_~>]/g, '')          // Bold/italic/heading markers
    .replace(/\n{2,}/g, ' ')          // Collapse blank lines
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ProjectUpdatesPreview({
  slug,
  projectId,
  isOwner,
  isMember,
  currentUserId,
  onOpenComposer,
  onSwitchToUpdatesTab,
}: Props) {
  const router = useRouter()

  const [updates, setUpdates] = useState<UpdatePreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ─── Fetch ──────────────────────────────────────────────────────────
  const fetchUpdates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/projects/${slug}/updates?type=all&sort=newest&limit=${PREVIEW_LIMIT}`,
        { cache: 'no-store' }
      )
      const json = await res.json().catch(() => ({}))
      if (!isMountedRef.current) return

      if (!res.ok) {
        setError(json?.error || 'Failed to load updates')
        return
      }

      setUpdates(json.updates || [])
      // Estimate total: if we got the full page, there may be more
      setTotalCount(
        json.total !== undefined
          ? json.total
          : (json.has_more ? (json.updates?.length || 0) + 1 : (json.updates?.length || 0))
      )
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Network error')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchUpdates() }, [fetchUpdates])

  // ─── Scroll state tracking ──────────────────────────────────────────
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState, updates])

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const distance = Math.max(300, el.clientWidth * 0.85)
    el.scrollBy({ left: direction === 'right' ? distance : -distance, behavior: 'smooth' })
  }, [])

  const canCompose = isOwner || isMember

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <section className="mb-8">
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold text-white leading-tight tracking-tight">
            Latest Updates
          </h2>
          <p className="text-[12.5px] text-white/50 mt-1 font-medium">
            What the team is shipping and building
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canCompose && onOpenComposer && (
            <button
              onClick={onOpenComposer}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black hover:bg-white/90 text-[12.5px] font-bold shadow-sm transition-colors"
            >
              <Plus size={12} weight="bold" /> Post update
            </button>
          )}
          {updates.length > 0 && onSwitchToUpdatesTab && (
            <button
              onClick={onSwitchToUpdatesTab}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
            >
              View all
              {totalCount !== null && totalCount > 0 && (
                <span className="text-white/40 font-mono ml-0.5">({totalCount})</span>
              )}
              <ArrowRight size={11} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* ─── STATE: LOADING ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="min-w-[300px] w-[300px] h-[220px] bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        // ─── STATE: ERROR ────────────────────────────────────────────
        <div className="bg-red-500/[0.05] border border-red-500/20 rounded-xl px-5 py-6 flex items-center gap-3">
          <WarningCircle size={20} weight="fill" className="text-red-300 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-white">Could not load updates</p>
            <p className="text-[12px] text-white/50">{error}</p>
          </div>
          <button
            onClick={fetchUpdates}
            className="px-3 h-8 rounded-md text-[12px] font-semibold text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.15] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : updates.length === 0 ? (
        // ─── STATE: EMPTY ────────────────────────────────────────────
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-8 py-10 text-center">
          <ChatCircleDots size={30} weight="fill" className="text-white/25 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-white/70 mb-1">No updates yet</p>
          <p className="text-[12.5px] text-white/45 mb-4">
            {canCompose
              ? 'Post your first update to share progress with your community.'
              : 'The team hasn\'t posted any updates yet — check back soon.'}
          </p>
          {canCompose && onOpenComposer && (
            <button
              onClick={onOpenComposer}
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-white text-black hover:bg-white/90 text-[12.5px] font-bold transition-colors"
            >
              <Plus size={12} weight="bold" /> Post first update
            </button>
          )}
        </div>
      ) : (
        // ─── STATE: OK ───────────────────────────────────────────────
        <div className="relative group">
          {/* Left scroll button */}
          {canScrollLeft && (
            <button
              onClick={() => scrollBy('left')}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-9 h-9 rounded-full bg-[#0d0d10] border border-white/[0.15] text-white/70 hover:text-white hover:bg-[#12121a] items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              <ArrowLeft size={14} weight="bold" />
            </button>
          )}

          {/* Right scroll button */}
          {canScrollRight && (
            <button
              onClick={() => scrollBy('right')}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-9 h-9 rounded-full bg-[#0d0d10] border border-white/[0.15] text-white/70 hover:text-white hover:bg-[#12121a] items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              <ArrowRight size={14} weight="bold" />
            </button>
          )}

          {/* Fade edges for visual polish */}
          {canScrollLeft && (
            <div className="hidden md:block absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#05070D] to-transparent pointer-events-none z-[1]" />
          )}
          {canScrollRight && (
            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#05070D] to-transparent pointer-events-none z-[1]" />
          )}

          {/* Scrollable card strip */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {updates.map(u => (
              <UpdatePreviewCard
                key={u.id}
                update={u}
                slug={slug}
              />
            ))}

            {/* "See all" card at the end when many updates exist */}
            {updates.length >= PREVIEW_LIMIT && onSwitchToUpdatesTab && (
              <button
                onClick={onSwitchToUpdatesTab}
                className="min-w-[280px] w-[280px] snap-start bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] hover:border-white/[0.2] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                  <CaretRight size={18} weight="bold" className="text-white/60 group-hover:text-white ml-0.5" />
                </div>
                <p className="text-[13.5px] font-bold text-white text-center">View all updates</p>
                <p className="text-[11.5px] text-white/45 text-center">
                  {totalCount !== null && totalCount > 0
                    ? `${totalCount} total`
                    : 'Browse the full feed'}
                </p>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PREVIEW CARD
// Matches your reference image style: category label · bold title · excerpt · author + external icon
// ═══════════════════════════════════════════════════════════════════════════

function UpdatePreviewCard({
  update,
  slug,
}: {
  update: UpdatePreview
  slug: string
}) {
  const typeCfg = UPDATE_TYPE_META[update.update_type] || UPDATE_TYPE_META.general
  const TypeIcon = typeCfg.icon
  const excerpt = useMemo(() => extractExcerpt(update), [update])
  const author = update.user

  const isRelease = update.release_label === 'release'
  const isPreRelease = update.release_label === 'pre-release'

  return (
    <Link
      href={`/projects/${slug}/updates/${update.id}`}
      className="group snap-start min-w-[300px] w-[300px] sm:min-w-[320px] sm:w-[320px] bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.04] rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm relative overflow-hidden"
    >
      {/* Corner indicators: pinned + release */}
      <div className="flex items-start justify-between gap-2 mb-4">
        {/* Left: type badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <TypeIcon size={12} weight="fill" className="text-white/50 shrink-0" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 font-bold truncate">
            {typeCfg.label}
          </span>
        </div>

        {/* Right: badges (release / pinned / bookmark) */}
        <div className="flex items-center gap-1 shrink-0">
          {update.is_pinned && (
            <PushPin
              size={13}
              weight="fill"
              className="text-[#38bdf8]"
              aria-label="Pinned"
            />
          )}
          {isRelease && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Release" />
          )}
          {isPreRelease && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Pre-release" />
          )}
          <BookmarkSimple
            size={13}
            weight="regular"
            className="text-white/25 group-hover:text-white/60 transition-colors ml-0.5"
          />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-extrabold text-white leading-snug tracking-tight mb-2 line-clamp-2 group-hover:text-white transition-colors">
        {update.title || (excerpt ? excerpt.split(' ').slice(0, 8).join(' ') + '…' : 'Untitled update')}
      </h3>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2 mb-5 flex-1">
          {excerpt}
        </p>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/[0.05] mt-auto">
        <div className="flex items-center gap-2 min-w-0">
          {author?.avatar_url ? (
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.08] shrink-0">
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white/70">
                {(author?.full_name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-semibold text-white truncate">
                {author?.full_name || 'Unknown'}
              </span>
              {author?.is_verified && (
                <Certificate size={10} weight="fill" className="text-[#93c5fd] shrink-0" />
              )}
            </div>
            <span className="text-[10.5px] text-white/40 block leading-tight mt-0.5">
              {timeAgo(update.created_at)}
            </span>
          </div>
        </div>

        <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] group-hover:bg-white/[0.08] group-hover:border-white/[0.15] flex items-center justify-center transition-colors shrink-0">
          <ArrowRight
            size={12}
            weight="bold"
            className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>

      {/* Release accent bar (top) */}
      {isRelease && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-emerald-400 to-emerald-500/50" />
      )}
      {isPreRelease && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/50 via-amber-400 to-amber-500/50" />
      )}
    </Link>
  )
}