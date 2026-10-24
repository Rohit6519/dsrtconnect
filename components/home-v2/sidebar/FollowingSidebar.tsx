'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CheckCircle, Rocket } from '@phosphor-icons/react'

interface FollowedItem {
  id: string
  name: string
  handle: string
  avatar_url: string | null
  is_verified: boolean
  type: 'user' | 'venture'
  slug: string
  latest_post_at: string | null
  has_new: boolean
}

interface Props {
  currentUser: any
}

export function FollowingSidebar({ currentUser }: Props) {
  const [items, setItems] = useState<FollowedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/home/following/list')
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 overflow-hidden">
      <div className="px-3 py-3 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users size={13} weight="regular" className="text-zinc-400" />
          <h3 className="text-[12.5px] font-bold text-white tracking-tight">Following</h3>
        </div>
        <Link href="/my-network" className="text-[10.5px] font-semibold text-zinc-500 hover:text-white transition-colors">
          See all
        </Link>
      </div>

      {loading ? (
        <div className="p-3 space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 rounded-md bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-[11.5px] text-zinc-500 mb-2">You're not following anyone yet.</p>
          <Link href="/my-network" className="inline-block text-[11px] font-bold text-blue-400 hover:text-blue-300">
            Discover builders →
          </Link>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
          {items.map(item => (
            <FollowedRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function FollowedRow({ item }: { item: FollowedItem }) {
  const href = item.type === 'venture' ? `/ventures/${item.slug}` : `/profile/${item.handle}`

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900/50 transition-colors border-b border-zinc-900/40 last:border-b-0"
    >
      <div className="relative shrink-0">
        <div className={
          'w-8 h-8 overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center ' +
          (item.type === 'venture' ? 'rounded-md' : 'rounded-full')
        }>
          {item.avatar_url ? (
            <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-zinc-500">
              {item.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>
        {item.has_new && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[#0a0a0b]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[12.5px] font-semibold text-white truncate">{item.name}</span>
          {item.is_verified && <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />}
          {item.type === 'venture' && (
            <Rocket size={9} weight="fill" className="text-zinc-500 shrink-0" />
          )}
        </div>
        <div className="text-[10.5px] text-zinc-500 truncate">@{item.handle}</div>
      </div>
    </Link>
  )
}