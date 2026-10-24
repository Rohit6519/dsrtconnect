'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { FeaturedWorkCardCompact } from './FeaturedWorkCardCompact'
import { FeaturedWorkEditor } from './FeaturedWorkEditor'
import { FeaturedWorkDetailLightbox } from './FeaturedWorkDetailLightbox'
import { FeaturedWorkTabs } from './FeaturedWorkTabs'
import type { MediaItem } from './MediaCarousel'
import { ProfileCard } from '../shared/ProfileCard'
import { Plus, Briefcase, Spinner, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface FeaturedWork {
  id: string
  title: string
  description_html?: string | null
  media?: MediaItem[]
  position?: number
}

interface FeaturedWorkSectionProps {
  userId: string
  isOwner: boolean
}

export function FeaturedWorkSection({ userId, isOwner }: FeaturedWorkSectionProps) {
  const [works, setWorks] = useState<FeaturedWork[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWork, setEditingWork] = useState<FeaturedWork | null>(null)
  const [detailWork, setDetailWork] = useState<FeaturedWork | null>(null)

  // Carousel scroll
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/profile/featured-work?user_id=${userId}`)
        if (res.ok) {
          const data = await res.json()
          const list: FeaturedWork[] = data.works || []
          setWorks(list)
          if (list.length > 0) setActiveTabId(list[0].id)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete featured work "${title}"?`)) return
    try {
      const res = await fetch(`/api/profile/featured-work/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setWorks((cur) => {
        const next = cur.filter((w) => w.id !== id)
        if (activeTabId === id) {
          setActiveTabId(next[0]?.id || null)
        }
        return next
      })
      if (detailWork?.id === id) setDetailWork(null)
      toast.success('Work deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleSave = (saved: FeaturedWork) => {
    if (editingWork) {
      setWorks((cur) => cur.map((w) => (w.id === saved.id ? saved : w)))
      if (detailWork?.id === saved.id) setDetailWork(saved)
    } else {
      setWorks((cur) => [...cur, saved])
      setActiveTabId(saved.id)
    }
    setEditorOpen(false)
    setEditingWork(null)
  }

  const handleReorder = async (newOrder: string[]) => {
    // Optimistic UI
    const workMap = new Map(works.map((w) => [w.id, w]))
    const reorderedWorks = newOrder.map((id) => workMap.get(id)!).filter(Boolean)
    setWorks(reorderedWorks)

    setTimeout(() => scrollActiveIntoView(activeTabId), 100)

    try {
      const res = await fetch('/api/profile/featured-work/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      })
      if (!res.ok) throw new Error('Reorder failed')
    } catch {
      toast.error('Failed to save order')
      const res = await fetch(`/api/profile/featured-work?user_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setWorks(data.works || [])
      }
    }
  }

  const scrollActiveIntoView = (id: string | null) => {
    if (!id || !scrollRef.current) return
    const el = scrollRef.current.querySelector(`[data-work-id="${id}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    }
  }

  const handleTabSelect = (id: string) => {
    setActiveTabId(id)
    scrollActiveIntoView(id)
  }

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' })
  }
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' })
  }

  // Visitor + empty → hide entire section
  if (!isOwner && works.length === 0 && !loading) return null

  const hasWorks = works.length > 0

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-zinc-500" weight="duotone" />
            <h2 className="text-[14px] font-bold text-zinc-100 tracking-tight">
              Featured Work
            </h2>
            {hasWorks && (
              <span className="text-[10px] text-zinc-600 font-semibold">
                {works.length}
              </span>
            )}
          </div>

          {/* + Add Work button (always at top when works exist) */}
          {isOwner && hasWorks && (
            <button
              onClick={() => { setEditingWork(null); setEditorOpen(true) }}
              className="flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" />
              Add Work
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <ProfileCard>
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-5 h-5 text-zinc-600 animate-spin" weight="bold" />
            </div>
          </ProfileCard>
        )}

        {/* Inline editor when zero works exist (owner only) */}
        {!loading && !hasWorks && isOwner && (
          <div className="rounded-2xl overflow-hidden border border-zinc-800/60">
            <InlineFirstWorkEditor onSave={handleSave} />
          </div>
        )}

        {/* Empty state for visitor (safety) */}
        {!loading && !hasWorks && !isOwner && (
          <ProfileCard>
            <div className="py-10 text-center">
              <Briefcase className="w-8 h-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
              <p className="text-[12px] text-zinc-600 italic">No featured work yet</p>
            </div>
          </ProfileCard>
        )}

        {/* Works exist → Chrome tabs + horizontal carousel */}
        {!loading && hasWorks && (
          <>
            {/* Chrome-style tab bar */}
            <FeaturedWorkTabs
              works={works}
              activeId={activeTabId}
              isOwner={isOwner}
              onSelect={handleTabSelect}
              onReorder={handleReorder}
            />

            {/* Horizontal carousel with scroll controls */}
            <div className="relative">
              {/* Left scroll button (hidden on mobile) */}
              {works.length > 1 && (
                <div className="hidden md:block">
                  <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/80 backdrop-blur-sm border border-zinc-700 text-white flex items-center justify-center hover:bg-black/95 transition-colors shadow-lg"
                    title="Scroll left"
                  >
                    <CaretLeft className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              )}

              {/* Scrollable strip */}
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 pt-1 -mx-1 px-1 scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: 'thin' }}
              >
                {works.map((work) => (
                  <div
                    key={work.id}
                    data-work-id={work.id}
                    className={cn(
                      'snap-start transition-transform',
                      activeTabId === work.id && 'ring-2 ring-blue-500/40 rounded-2xl',
                    )}
                  >
                    <FeaturedWorkCardCompact
                      work={work}
                      isOwner={isOwner}
                      onOpen={() => setDetailWork(work)}
                      onEdit={() => { setEditingWork(work); setEditorOpen(true) }}
                      onDelete={() => handleDelete(work.id, work.title)}
                    />
                  </div>
                ))}
              </div>

              {/* Right scroll button (hidden on mobile) */}
              {works.length > 1 && (
                <div className="hidden md:block">
                  <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/80 backdrop-blur-sm border border-zinc-700 text-white flex items-center justify-center hover:bg-black/95 transition-colors shadow-lg"
                    title="Scroll right"
                  >
                    <CaretRight className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Editor modal (used for both add + edit when works exist) */}
      <AnimatePresence>
        {editorOpen && (
          <FeaturedWorkEditor
            entry={editingWork}
            onSave={handleSave}
            onCancel={() => { setEditorOpen(false); setEditingWork(null) }}
          />
        )}
      </AnimatePresence>

      {/* Detail lightbox */}
      <AnimatePresence>
        {detailWork && (
          <FeaturedWorkDetailLightbox
            work={detailWork}
            isOwner={isOwner}
            onClose={() => setDetailWork(null)}
            onEdit={() => {
              setEditingWork(detailWork)
              setDetailWork(null)
              setEditorOpen(true)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Inline First-Work Editor ────────────────────────────────────────────
// When user has zero works, the full editor sits inline in the section.
// Uses FeaturedWorkEditor with `inline` prop = renders without fixed backdrop.

function InlineFirstWorkEditor({ onSave }: { onSave: (saved: any) => void }) {
  const [key, setKey] = useState(0)

  return (
    <div className="relative bg-zinc-950">
      <FeaturedWorkEditor
        key={key}
        entry={null}
        onSave={(saved) => {
          onSave(saved)
          setKey((k) => k + 1) // reset editor after save
        }}
        onCancel={() => {
          // No cancel action inline — just reset the form
          setKey((k) => k + 1)
          toast.info('Form cleared')
        }}
        inline
      />
    </div>
  )
}