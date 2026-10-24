'use client'

import { useState, useTransition } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { trackDiscoverEvents } from '@/hooks/useCommunityDiscover'
import type { DiscoverCommunityCard } from '@/hooks/useCommunityDiscover'

interface FollowPillProps {
  community: DiscoverCommunityCard
  surface: string
  onChange?: (following: boolean) => void
}

export function FollowPill({ community, surface, onChange }: FollowPillProps) {
  const [pending, startTransition] = useTransition()
  const [following, setFollowing] = useState<boolean>(!!community.is_following)

  const handle = () => {
    if (pending) return
    const next = !following
    // Optimistic
    setFollowing(next)
    onChange?.(next)

    trackDiscoverEvents([
      { community_id: community.id, event_type: 'FOLLOW_CLICK', surface, metadata: { next } },
    ])

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/communities/${community.id}/follow`, {
          method: next ? 'POST' : 'DELETE',
        })
        if (!res.ok) {
          // Rollback
          setFollowing(!next)
          onChange?.(!next)
          toast.error('Could not update follow')
        }
      } catch {
        setFollowing(!next)
        onChange?.(!next)
        toast.error('Network error')
      }
    })
  }

  return (
    <button
      onClick={handle}
      aria-pressed={following}
      className={cn(
        'w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
        following
          ? 'border-white/[0.12] bg-white/[0.06] text-white'
          : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/[0.06]'
      )}
      title={following ? 'Following' : 'Follow'}
    >
      {following ? (
        <BookmarkCheck className="w-4 h-4" strokeWidth={1.75} />
      ) : (
        <Bookmark className="w-4 h-4" strokeWidth={1.75} />
      )}
    </button>
  )
}