'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommunityCard } from './CommunityCard'
import { SectionHeader, EmptyState, ErrorState, SkeletonCards } from '@/components/kernel-ui'
import type { DiscoverCommunityCard } from '@/hooks/useCommunityDiscover'
import { LucideIcon } from 'lucide-react'

interface DiscoverRailProps {
  title: string
  description?: string
  items: DiscoverCommunityCard[]
  loading: boolean
  error: string | null
  surface: string
  onDismiss?: (id: string) => void
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  variant?: 'grid' | 'horizontal'
}

export function DiscoverRail({
  title,
  description,
  items,
  loading,
  error,
  surface,
  onDismiss,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  variant = 'horizontal',
}: DiscoverRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <section>
        <SectionHeader title={title} description={description} variant="mono" />
        <SkeletonCards count={4} />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <SectionHeader title={title} description={description} variant="mono" />
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ErrorState variant="compact" errorCode={error} />
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section>
        <SectionHeader title={title} description={description} variant="mono" />
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            variant="compact"
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        </div>
      </section>
    )
  }

  if (variant === 'grid') {
    return (
      <section>
        <SectionHeader title={title} description={description} variant="mono" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((c) => (
            <CommunityCard
              key={c.id}
              community={c}
              surface={surface}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="label-mono text-white/50">{title}</p>
          {description && (
            <p className="mt-1 text-[13px] text-white/50">{description}</p>
          )}
        </div>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            className={cn(
              'w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.02]',
              'text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors'
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => scroll(1)}
            className={cn(
              'w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.02]',
              'text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors'
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
      >
        {items.map((c) => (
          <div key={c.id} className="snap-start">
            <CommunityCard
              community={c}
              surface={surface}
              variant="horizontal"
              onDismiss={onDismiss}
            />
          </div>
        ))}
      </div>
    </section>
  )
}