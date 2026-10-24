'use client'

import Link from 'next/link'
import { CheckCircle, ArrowUpRight } from '@phosphor-icons/react'

interface Props {
  opportunity: any
}

export function PosterCard({ opportunity }: Props) {
  const poster = opportunity.poster
  if (!poster) return null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
        Posted by
      </h3>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
          {poster.avatar_url ? (
            <img src={poster.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[14px] font-bold text-zinc-500">
              {(poster.full_name || poster.username || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-[14px] font-bold text-white truncate">
              {poster.full_name || poster.username}
            </h4>
            {poster.is_verified && (
              <CheckCircle size={12} weight="fill" className="text-blue-400 shrink-0" />
            )}
          </div>
          {poster.tagline && (
            <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">
              {poster.tagline}
            </p>
          )}
        </div>
      </div>

      {poster.follower_count > 0 && (
        <div className="text-[11.5px] text-zinc-500 mb-3">
          {poster.follower_count.toLocaleString()} followers
        </div>
      )}

      <Link
        href={`/profile/${poster.username}`}
        className="inline-flex items-center gap-1 w-full justify-center h-8 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] font-semibold text-zinc-300 hover:text-white transition-colors"
      >
        View profile
        <ArrowUpRight size={10} weight="bold" />
      </Link>
    </div>
  )
}