'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, UserPlus, Clock, Lock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { trackDiscoverEvents } from '@/hooks/useCommunityDiscover'
import type { DiscoverCommunityCard } from '@/hooks/useCommunityDiscover'

interface JoinPillProps {
  community: DiscoverCommunityCard
  surface: string
  onStatusChange?: (status: string) => void
  compact?: boolean
}

export function JoinPill({ community, surface, onStatusChange, compact }: JoinPillProps) {
  const [pending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<string | null>(community.membership_status ?? null)
  const [localMember, setLocalMember] = useState(community.is_member ?? false)

  const handle = () => {
    if (pending) return

    trackDiscoverEvents([
      { community_id: community.id, event_type: 'JOIN_CLICK', surface },
    ])

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/communities/${community.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `join-${community.id}-${Date.now()}`,
          },
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json?.error?.message || 'Could not join community')
          return
        }
        const nextStatus = json?.data?.status ?? 'ACTIVE'
        setLocalStatus(nextStatus)
        setLocalMember(nextStatus === 'ACTIVE')
        onStatusChange?.(nextStatus)

        if (nextStatus === 'ACTIVE') toast.success(`Joined ${community.name}`)
        else if (nextStatus === 'PENDING') toast.message('Request sent for review')
      } catch {
        toast.error('Network error — please try again')
      }
    })
  }

  // CLOSED / INVITE_ONLY handling
  const isClosed = community.join_policy === 'CLOSED'
  const isInviteOnly = community.join_policy === 'INVITE_ONLY'
  const isPending = localStatus === 'PENDING' || localStatus === 'APPLIED'
  const isBanned = localStatus === 'BANNED'

  if (isBanned) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300 font-medium',
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
        )}
      >
        <X className="w-3 h-3" strokeWidth={1.75} />
        Blocked
      </button>
    )
  }

  if (localMember) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] text-white/70 font-medium',
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
        )}
      >
        <Check className="w-3 h-3" strokeWidth={1.75} />
        Member
      </button>
    )
  }

  if (isPending) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 font-medium',
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
        )}
      >
        <Clock className="w-3 h-3" strokeWidth={1.75} />
        Pending
      </button>
    )
  }

  if (isClosed) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/40 font-medium',
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
        )}
      >
        <Lock className="w-3 h-3" strokeWidth={1.75} />
        Closed
      </button>
    )
  }

  if (isInviteOnly) {
    return (
      <button
        disabled
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/50 font-medium',
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
        )}
      >
        <Lock className="w-3 h-3" strokeWidth={1.75} />
        Invite only
      </button>
    )
  }

  const requiresApproval = community.join_policy === 'APPROVAL_REQUIRED'
  const label = requiresApproval ? 'Request to join' : 'Join'

  return (
    <button
      onClick={handle}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
        'bg-white text-black border-white hover:bg-zinc-100',
        pending && 'opacity-70',
        compact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]'
      )}
    >
      {pending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <UserPlus className="w-3 h-3" strokeWidth={1.75} />
      )}
      {label}
    </button>
  )
}