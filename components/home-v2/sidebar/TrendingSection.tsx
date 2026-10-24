'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendUp } from '@phosphor-icons/react'

export function TrendingSection() {
  const [hashtags, setHashtags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/home/trending/hashtags?limit=6')
      .then(r => r.json())
      .then(d => setHashtags(d.hashtags || []))
      .catch(() => setHashtags([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={
      'rounded-xl border border-zinc-800/60 overflow-hidden ' +
      'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 ' +
      'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.25)]'
    }>
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-1.5">
        <TrendUp size={12} weight="regular" className="text-zinc-400" />
        <h3 className="text-[13px] font-bold text-white tracking-tight">Trending in DSRT</h3>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-10 bg-zinc-900/50 rounded animate-pulse" />
          ))}
        </div>
      ) : hashtags.length === 0 ? (
        <p className="p-4 text-[12px] text-zinc-500 text-center">No trends yet</p>
      ) : (
        <div className="divide-y divide-zinc-800/40">
          {hashtags.map((h, i) => (
            <Link
              key={h.id}
              href={`/search?q=%23${encodeURIComponent(h.slug)}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/40 transition-colors"
            >
              <span className="text-[12px] font-bold text-zinc-600 w-4 shrink-0 tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-white truncate tracking-tight">
                  #{h.tag}
                </div>
                <div className="text-[11px] text-zinc-500 tabular-nums">
                  {h.post_count.toLocaleString()} {h.post_count === 1 ? 'post' : 'posts'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}