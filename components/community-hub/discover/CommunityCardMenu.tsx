'use client'

import { MoreHorizontal, Share2, Flag, EyeOff } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'
import type { DiscoverCommunityCard } from '@/hooks/useCommunityDiscover'

interface Props {
  community: DiscoverCommunityCard
  onDismiss?: (id: string) => void
}

export function CommunityCardMenu({ community, onDismiss }: Props) {
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/community/${community.slug}`
    : `/community/${community.slug}`

  const doShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: community.name,
          text: community.short_description || undefined,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied')
      }
    } catch {
      // user cancelled or unavailable — silent
    }
  }

  const doDismiss = async () => {
    onDismiss?.(community.id)
    try {
      await fetch('/api/v1/community/discover/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_id: community.id }),
      })
    } catch {
      // silent
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          title="More"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 bg-[#0f0f14] border-white/[0.08] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onClick={doShare} className="focus:bg-white/[0.06] text-white/80 focus:text-white cursor-pointer">
          <Share2 className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
          Share
        </DropdownMenuItem>
        {onDismiss && (
          <DropdownMenuItem onClick={doDismiss} className="focus:bg-white/[0.06] text-white/80 focus:text-white cursor-pointer">
            <EyeOff className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
            Not interested
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuItem className="focus:bg-white/[0.06] text-white/60 focus:text-white cursor-pointer">
          <Flag className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
          Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}