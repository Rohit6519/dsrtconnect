'use client'

import { useState, useTransition } from 'react'
import { Check, Clock, Loader2, Lock, UserPlus, X, Bookmark, BookmarkCheck, Share2, MoreHorizontal, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Props {
  communityId: string
  slug: string
  name: string
  joinPolicy: 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITE_ONLY' | 'CLOSED'
  membershipStatus: string | null
  isMember: boolean
  isFollowingInitial?: boolean
  isOwner: boolean
  onChanged?: () => void
}

export function CommunityHeaderActions({
  communityId,
  slug,
  name,
  joinPolicy,
  membershipStatus,
  isMember,
  isFollowingInitial,
  isOwner,
  onChanged,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [action, setAction] = useState<'join' | 'leave' | 'follow' | null>(null)
  const [localMember, setLocalMember] = useState(isMember)
  const [localStatus, setLocalStatus] = useState<string | null>(membershipStatus)
  const [following, setFollowing] = useState<boolean>(!!isFollowingInitial)

  const isBanned = localStatus === 'BANNED'
  const isPending = localStatus === 'PENDING' || localStatus === 'APPLIED'

  const doJoin = () => {
    setAction('join')
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/communities/${communityId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `join-${communityId}-${Date.now()}`,
          },
        })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json?.error?.message || 'Could not join')
          setAction(null)
          return
        }
        const nextStatus = json?.data?.status ?? 'ACTIVE'
        setLocalStatus(nextStatus)
        setLocalMember(nextStatus === 'ACTIVE')
        if (nextStatus === 'ACTIVE') toast.success(`Joined ${name}`)
        else if (nextStatus === 'PENDING') toast.message('Request sent for review')
        onChanged?.()
      } catch {
        toast.error('Network error')
      } finally {
        setAction(null)
      }
    })
  }

  const doLeave = () => {
    if (isOwner) {
      toast.error('Owners cannot leave. Transfer ownership first.')
      return
    }
    if (!confirm(`Leave ${name}? You can rejoin later.`)) return
    setAction('leave')
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/communities/${communityId}/leave`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json?.error?.message || 'Could not leave')
          setAction(null)
          return
        }
        setLocalMember(false)
        setLocalStatus('LEFT')
        toast.success(`Left ${name}`)
        onChanged?.()
      } catch {
        toast.error('Network error')
      } finally {
        setAction(null)
      }
    })
  }

  const toggleFollow = () => {
    const next = !following
    setFollowing(next)
    setAction('follow')
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/communities/${communityId}/follow`, {
          method: next ? 'POST' : 'DELETE',
        })
        if (!res.ok) {
          setFollowing(!next)
          toast.error('Could not update follow')
        }
      } catch {
        setFollowing(!next)
        toast.error('Network error')
      } finally {
        setAction(null)
      }
    })
  }

  const share = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/community/${slug}` : `/community/${slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {
      /* user cancelled */
    }
  }

  // ---------- Primary button ----------
  let primary: React.ReactNode
  if (isBanned) {
    primary = (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 text-red-300 px-4 py-2 text-[12.5px] font-medium"
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.75} />
        Blocked
      </button>
    )
  } else if (localMember) {
    primary = (
      <button
        onClick={doLeave}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-white px-4 py-2 text-[12.5px] font-medium hover:bg-white/[0.08] transition-colors',
          pending && 'opacity-70'
        )}
      >
        {pending && action === 'leave' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={1.75} />}
        Member
      </button>
    )
  } else if (isPending) {
    primary = (
      <button disabled className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 px-4 py-2 text-[12.5px] font-medium">
        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
        Pending review
      </button>
    )
  } else if (joinPolicy === 'CLOSED') {
    primary = (
      <button disabled className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/40 px-4 py-2 text-[12.5px] font-medium">
        <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
        Closed
      </button>
    )
  } else if (joinPolicy === 'INVITE_ONLY') {
    primary = (
      <button disabled className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-white/50 px-4 py-2 text-[12.5px] font-medium">
        <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
        Invite only
      </button>
    )
  } else {
    const label = joinPolicy === 'APPROVAL_REQUIRED' ? 'Request to join' : 'Join community'
    primary = (
      <button
        onClick={doJoin}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-2 text-[12.5px] font-semibold hover:bg-zinc-100 transition-colors',
          pending && 'opacity-70'
        )}
      >
        {pending && action === 'join' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" strokeWidth={1.75} />}
        {label}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {primary}

      <button
        onClick={toggleFollow}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors',
          following
            ? 'border-white/[0.14] bg-white/[0.06] text-white'
            : 'border-white/[0.08] bg-white/[0.02] text-white/70 hover:text-white hover:bg-white/[0.05]'
        )}
      >
        {following ? <BookmarkCheck className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Bookmark className="w-3.5 h-3.5" strokeWidth={1.75} />}
        {following ? 'Following' : 'Follow'}
      </button>

      <button
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-white/70 hover:text-white hover:bg-white/[0.05] px-3 py-2 text-[12px] font-medium transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        Share
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="More actions"
            className="w-9 h-9 rounded-full border border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 bg-[#0f0f14] border-white/[0.08] text-white">
          <DropdownMenuItem onClick={share} className="focus:bg-white/[0.06] text-white/80 focus:text-white cursor-pointer">
            <Share2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.06]" />
          <DropdownMenuItem className="focus:bg-white/[0.06] text-white/60 focus:text-white cursor-pointer">
            <Flag className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
            Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}