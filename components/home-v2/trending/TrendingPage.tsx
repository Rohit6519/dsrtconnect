'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendUp, ArrowClockwise } from '@phosphor-icons/react'
import { HomePostCard } from '../HomePostCard'

interface Props {
  currentUser: any
}

export function TrendingPage({ currentUser }: Props) {
  const [posts, setPosts] = useState<any[]>([])
  const [hashtags, setHashtags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [postsRes, hashtagsRes] = await Promise.all([
        fetch('/api/home/trending/posts?limit=20').then(r => r.json()),
        fetch('/api/home/trending/hashtags?limit=10').then(r => r.json()),
      ])
      setPosts(postsRes.posts || [])
      setHashtags(hashtagsRes.hashtags || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/home/trending/refresh', { method: 'POST' })
      await load()
    } catch {} finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendUp size={18} weight="regular" className="text-zinc-400" />
              <h1 className="text-[26px] font-bold text-white tracking-tight">Trending</h1>
            </div>
            <p className="text-[12.5px] text-zinc-500">
              What's gaining traction across DSRT right now
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className={
              'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg ' +
              'border border-zinc-800 hover:border-zinc-700 ' +
              'text-[12.5px] font-medium text-zinc-300 hover:text-white transition-colors ' +
              'disabled:opacity-50'
            }
          >
            <ArrowClockwise size={11} weight="regular" className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          {/* Trending posts */}
          <main className="min-w-0 space-y-3">
            {loading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="h-40 rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
              ))
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
                <p className="text-[14px] font-semibold text-white mb-1.5">Nothing trending yet</p>
                <p className="text-[12.5px] text-zinc-500">
                  Trending posts will appear as engagement builds.
                </p>
              </div>
            ) : (
              posts.map(post => (
                <HomePostCard key={post.id} post={post} currentUser={currentUser} />
              ))
            )}
          </main>

          {/* Trending hashtags */}
          <aside className="hidden lg:block">
            <div className="sticky top-[80px] rounded-xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.25)]">
              <div className="px-4 py-3 border-b border-zinc-800/50">
                <h3 className="text-[13px] font-bold text-white tracking-tight">Trending hashtags</h3>
              </div>
              <div className="divide-y divide-zinc-800/40">
                {hashtags.map((h, i) => (
                  <Link
                    key={h.id}
                    href={`/search?q=%23${encodeURIComponent(h.slug)}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="text-[12px] font-bold text-zinc-600 w-4 shrink-0 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-white truncate tracking-tight">#{h.tag}</div>
                      <div className="text-[11px] text-zinc-500 tabular-nums">
                        {h.post_count.toLocaleString()} posts
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}