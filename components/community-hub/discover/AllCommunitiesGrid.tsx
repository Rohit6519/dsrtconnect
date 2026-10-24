'use client'

import { useEffect, useRef, useState } from 'react'
import { CommunityCard } from './CommunityCard'
import { DiscoverFilters, DiscoverFilterState } from './DiscoverFilters'
import {
  EmptyState,
  ErrorState,
  SkeletonCards,
  LoadingState,
} from '@/components/kernel-ui'
import { Compass } from 'lucide-react'
import type { DiscoverCommunityCard } from '@/hooks/useCommunityDiscover'
import { useStableCallback } from '@/hooks/useStableCallback'

function toQuery(filters: DiscoverFilterState, cursor: string | null, limit: number) {
  const p = new URLSearchParams()
  if (filters.category) p.set('category', filters.category)
  if (filters.community_type) p.set('community_type', filters.community_type)
  if (filters.join_policy) p.set('join_policy', filters.join_policy)
  if (filters.verified_only) p.set('verified_only', 'true')
  if (filters.location) p.set('location', filters.location)
  if (filters.sort) p.set('sort', filters.sort)
  if (cursor) p.set('cursor', cursor)
  p.set('limit', String(limit))
  return p.toString()
}

interface Props {
  initialCategory?: string
}

export function AllCommunitiesGrid({ initialCategory }: Props) {
  const [filters, setFilters] = useState<DiscoverFilterState>({
    sort: 'members',
    category: initialCategory,
  })
  const [items, setItems] = useState<DiscoverCommunityCard[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cursor kept in a ref so `load` doesn't need to change identity.
  const cursorRef = useRef<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const load = useStableCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true)
      setItems([])
      cursorRef.current = null
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const qs = toQuery(filters, reset ? null : cursorRef.current, 18)
      const res = await fetch(`/api/v1/community/discover/all?${qs}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.code || 'FETCH_FAILED')
        return
      }
      const page = json?.data
      if (reset) {
        setItems(page?.items || [])
      } else {
        setItems((prev) => [...prev, ...(page?.items || [])])
      }
      cursorRef.current = page?.next_cursor || null
      setHasMore(!!page?.has_more)
    } catch {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  })

  // Reset when filters change
  useEffect(() => {
    load(true)
  }, [
    load,
    filters.category,
    filters.community_type,
    filters.join_policy,
    filters.location,
    filters.verified_only,
    filters.sort,
  ])

  // Infinite scroll — observer no longer reconnects on cursor change
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const el = sentinelRef.current
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) load(false)
      },
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, load])

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="label-mono text-white/50">All communities</p>
          <p className="mt-1 text-[13px] text-white/50">
            Browse everything on DSRT. Use filters to narrow down.
          </p>
        </div>
        <DiscoverFilters value={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <SkeletonCards count={6} />
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ErrorState
            title="Could not load communities"
            description="Something went wrong fetching this list."
            errorCode={error}
            onRetry={() => load(true)}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            icon={Compass}
            title="No communities match those filters"
            description="Try clearing filters or searching for a specific interest."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((c) => (
              <CommunityCard
                key={c.id}
                community={c}
                surface="all"
                onDismiss={removeItem}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="pt-6">
              {loadingMore && <LoadingState variant="compact" label="Loading more…" />}
            </div>
          )}
        </>
      )}
    </section>
  )
}