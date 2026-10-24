'use client'

import { useEffect, useRef } from 'react'
import { Users } from 'lucide-react'
import {
  SectionHeader,
  SkeletonCards,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/kernel-ui'
import { PersonNetworkCard } from './PersonNetworkCard'
import { useNetworkPeople } from '@/hooks/useCommunityNetwork'

export function PeopleFromCommunities() {
  const { items, loading, loadingMore, hasMore, error, reload, loadMore } = useNetworkPeople()
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
    <section id="people">
      <SectionHeader
        title="People from your communities"
        description="Builders you've met by being part of the same community."
        variant="mono"
      />

      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ErrorState
            title="Could not load people"
            description="Something went wrong fetching your network."
            errorCode={error}
            onRetry={reload}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            icon={Users}
            title="No connections through communities yet"
            description="Join a few communities and this section will fill up automatically."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p: any) => (
              <PersonNetworkCard
                key={p.identity_id}
                identityId={p.identity_id}
                user={p.user}
                sharedCount={p.shared_communities}
                shared={p.shared}
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