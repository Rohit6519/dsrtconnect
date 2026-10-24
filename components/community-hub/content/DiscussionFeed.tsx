'use client'

import { useEffect, useRef } from 'react'
import { MessagesSquare } from 'lucide-react'
import { ErrorState, ForbiddenState } from '@/components/kernel-ui'
import { PostComposer } from './PostComposer'
import { AnnouncementComposer } from './AnnouncementComposer'
import { AnnouncementBanner } from './AnnouncementBanner'
import { PostCard } from './PostCard'
import { useCommunityFeed } from '@/hooks/useCommunityFeed'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { useUser } from '@/hooks/useUser'
import { DsrtEmpty, DsrtPanel, DsrtSkeleton, DsrtRowSkeleton } from '@/components/dsrt'

interface Props {
  detail: CommunityDetail
}

export function DiscussionFeed({ detail }: Props) {
  const { user } = useUser()
  const caps = detail.capabilities

  if (!caps.can_view) {
    return (
      <DsrtPanel>
        <ForbiddenState
          title="Members only"
          description="Join this community to view its discussion."
        />
      </DsrtPanel>
    )
  }

  return <DiscussionFeedContent detail={detail} currentUser={user} />
}

function DiscussionFeedContent({ detail, currentUser }: { detail: CommunityDetail; currentUser: any }) {
  const c = detail.community
  const caps = detail.capabilities
  const {
    items, pinned, announcements, loading, loadingMore, hasMore, error,
    reload, loadMore, removePost,
  } = useCommunityFeed(c.slug, c.id)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { rootMargin: '400px' })
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [hasMore, loading, loadMore])

  return (
    <div className="space-y-4">
      {caps.can_post && (
        <PostComposer
          communityId={c.id}
          slug={c.slug}
          currentUser={currentUser}
          onPosted={reload}
        />
      )}
      {caps.is_admin && (
        <AnnouncementComposer communityId={c.id} onPosted={reload} />
      )}

      {loading ? (
        <DsrtPanel>
          <DsrtRowSkeleton count={5} />
        </DsrtPanel>
      ) : error ? (
        <DsrtPanel>
          <ErrorState errorCode={error} onRetry={reload} />
        </DsrtPanel>
      ) : (
        <>
          {announcements.map((a: any) => (
            <AnnouncementBanner key={a.id} announcement={a} />
          ))}

          {pinned.map((p: any) => (
            <PostCard
              key={p.id}
              post={p}
              slug={c.slug}
              canModerate={caps.is_admin || caps.is_moderator}
              canPost={caps.can_post}
              onDeleted={removePost}
            />
          ))}

          {items.length === 0 && announcements.length === 0 && pinned.length === 0 ? (
            <DsrtPanel>
              <DsrtEmpty
                icon={MessagesSquare}
                title="No posts yet"
                description={caps.can_post ? 'Be the first to share something.' : 'Join to start the conversation.'}
              />
            </DsrtPanel>
          ) : (
            items.map((p: any) => (
              <PostCard
                key={p.id}
                post={p}
                slug={c.slug}
                canModerate={caps.is_admin || caps.is_moderator}
                canPost={caps.can_post}
                onDeleted={removePost}
              />
            ))
          )}

          {hasMore && (
            <div ref={sentinelRef} className="pt-4 flex justify-center">
              {loadingMore && <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Loading more...</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}