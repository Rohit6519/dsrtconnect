'use client'

import Link from 'next/link'
import { CheckCircle, ArrowUpRight } from '@phosphor-icons/react'

interface Props {
  post: any
}

export function PostContextSidebar({ post }: Props) {
  const pub = post.publisher

  return (
    <div className="sticky top-[84px] space-y-4">
      {/* Publisher card */}
      {pub && (
        <div className={
          'rounded-xl border border-zinc-800/60 p-4 ' +
          'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 ' +
          'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.25)]'
        }>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-3">
            About the {pub.type === 'venture' ? 'venture' : pub.type === 'project' ? 'project' : 'author'}
          </div>

          <div className="flex items-start gap-3 mb-3">
            <Link href={pub.type === 'venture' ? `/ventures/${pub.slug}` : pub.type === 'project' ? `/projects/${pub.slug}` : `/profile/${pub.handle}`}>
              <div className={
                'w-11 h-11 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
                (pub.type === 'venture' || pub.type === 'project' ? 'rounded-lg' : 'rounded-full')
              }>
                {pub.avatar_url ? (
                  <img src={pub.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[13px] font-bold text-zinc-400">
                    {pub.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Link href={pub.type === 'venture' ? `/ventures/${pub.slug}` : `/profile/${pub.handle}`}
                      className="text-[13.5px] font-bold text-white hover:underline truncate tracking-tight">
                  {pub.name}
                </Link>
                {pub.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400 shrink-0" />}
              </div>
              <div className="text-[11.5px] text-zinc-500 truncate">@{pub.handle}</div>
              {pub.follower_count > 0 && (
                <div className="text-[11px] text-zinc-500 mt-1 tabular-nums">
                  {pub.follower_count.toLocaleString()} followers
                </div>
              )}
            </div>
          </div>

          {(pub.tagline || pub.bio || pub.description) && (
            <p className="text-[12px] text-zinc-400 leading-relaxed line-clamp-4 mb-3">
              {pub.bio || pub.description || pub.tagline}
            </p>
          )}

          <Link
            href={pub.type === 'venture' ? `/ventures/${pub.slug}` : `/profile/${pub.handle}`}
            className="inline-flex items-center gap-1 w-full justify-center h-8 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            View {pub.type === 'venture' ? 'venture' : pub.type === 'project' ? 'project' : 'profile'}
            <ArrowUpRight size={10} weight="bold" />
          </Link>
        </div>
      )}

      {/* Post metadata */}
      <div className={
        'rounded-xl border border-zinc-800/60 p-4 ' +
        'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 ' +
        'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.25)]'
      }>
        <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-3">
          Post stats
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <StatBlock value={post.view_count || 0} label="Views" />
          <StatBlock value={post.reaction_count || 0} label="Reactions" />
          <StatBlock value={post.comment_count || 0} label="Comments" />
          <StatBlock value={post.repost_count || 0} label="Reposts" />
        </div>
      </div>
    </div>
  )
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-[18px] font-bold text-white tabular-nums tracking-tight">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold mt-0.5">
        {label}
      </div>
    </div>
  )
}