'use client'

import { useEffect, useRef } from 'react'
import { Activity } from 'lucide-react'
import {
  SectionHeader,
  SkeletonRows,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/kernel-ui'
import { NetworkActivityRow } from './NetworkActivityRow'
import { useNetworkActivity } from '@/hooks/useCommunityNetwork'

export function NetworkActivityFeed() {
  const { items, loading, loadingMore, hasMore, error, reload, loadMore } = useNetworkActivity()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore()
      },
      { rootMargin: '400px' }
    )
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [hasMore, loading, loadingMore, loadMore])

  return (
    <section id="activity">
      <SectionHeader
        title="Recent activity"
        description="What's happening across the communities you're in or following."
        variant="mono"
      />

      {loading ? (
        <SkeletonRows count={5} />
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ErrorState
            title="Could not load activity"
            description="Something went wrong fetching recent events."
            errorCode={error}
            onRetry={reload}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Join or follow a few communities and their events will stream in here live."
          />
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((a: any) => (
              <NetworkActivityRow
                key={a.id}
                verb={a.verb}
                occurredAt={a.occurred_at}
                actor={a.actor}
                community={a.community}
              />
            ))}
          </ul>
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