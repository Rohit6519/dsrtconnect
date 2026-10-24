'use client'

import Link from 'next/link'

interface FollowStatsSectionProps {
  username: string
  followerCount: number
  followingCount: number
}

export function FollowStatsSection({
  username,
  followerCount,
  followingCount,
}: FollowStatsSectionProps) {
  return (
    <div className="flex items-center gap-6">
      <Link
        href={`/profile/${username}/followers`}
        className="group flex flex-col items-start gap-0.5 hover:opacity-90 transition-opacity"
      >
        <span className="text-[17px] font-bold text-white leading-none tabular-nums">
          {(followerCount || 0).toLocaleString()}
        </span>
        <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors uppercase tracking-wide font-semibold">
          Followers
        </span>
      </Link>

      <div className="w-px h-8 bg-zinc-800/60" />

      <Link
        href={`/profile/${username}/following`}
        className="group flex flex-col items-start gap-0.5 hover:opacity-90 transition-opacity"
      >
        <span className="text-[17px] font-bold text-white leading-none tabular-nums">
          {(followingCount || 0).toLocaleString()}
        </span>
        <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors uppercase tracking-wide font-semibold">
          Following
        </span>
      </Link>
    </div>
  )
}