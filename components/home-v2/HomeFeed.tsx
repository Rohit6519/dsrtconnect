'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ArrowUp } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { HomePostCard } from './HomePostCard'
import type { HomeTab } from './HomeTabs'
import { DsrtFeedSkeleton, DsrtEmpty, DsrtButton } from '@/components/dsrt'

interface Props {
  tab: HomeTab
  currentUser: any
}

export function HomeFeed({ tab, currentUser }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const observerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadPosts = useCallback(async (append: boolean = false, useCursor: string | null = null) => {
    if (!mountedRef.current) return
    if (append) setLoadingMore(true); else setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ tab, limit: '20' })
      if (useCursor) params.set('cursor', useCursor)

      const res = await fetch(`/api/home/feed?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load feed')
      const data = await res.json()

      if (!mountedRef.current) return

      const safePosts = Array.isArray(data.posts) ? data.posts.filter((p: any) => p && p.id) : []

      if (append) {
        setPosts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id))
          const newOnes = safePosts.filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newOnes]
        })
      } else {
        setPosts(safePosts)
        setNewPostsCount(0)
      }
      setCursor(data.nextCursor || null)
      setHasMore(!!data.hasMore)
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Something went wrong connecting to DSRT servers.')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [tab])

  useEffect(() => {
    setPosts([])
    setCursor(null)
    setHasMore(false)
    setNewPostsCount(0)
    loadPosts(false, null)
  }, [tab, loadPosts])

  useEffect(() => {
    const el = observerRef.current
    if (!el || !hasMore || loading || loadingMore || !cursor) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && mountedRef.current) {
          loadPosts(true, cursor)
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, cursor, loading, loadingMore, loadPosts])

  useEffect(() => {
    if (tab !== 'latest' && tab !== 'for-you') return
    if (posts.length === 0) return
    const topCreatedAt = posts[0]?.created_at
    if (!topCreatedAt) return

    let channel: any = null
    try {
      channel = supabase
        .channel(`home-feed-${tab}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts', filter: 'visibility=eq.global' },
          (payload: any) => {
            if (!mountedRef.current) return
            const newPost = payload?.new
            if (!newPost || newPost.is_draft) return
            if (newPost.user_id === currentUser?.id) return

            try {
              const newTs = new Date(newPost.created_at).getTime()
              const topTs = new Date(topCreatedAt).getTime()
              if (newTs > topTs) setNewPostsCount(n => n + 1)
            } catch { /* ignore */ }
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('[Realtime] subscribe failed', e)
    }

    return () => { if (channel) { try { supabase.removeChannel(channel) } catch {} } }
  }, [posts, currentUser, tab, supabase])

  const loadNewPosts = useCallback(() => {
    setNewPostsCount(0)
    loadPosts(false, null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [loadPosts])

  if (loading) return <DsrtFeedSkeleton count={3} />

  if (error) {
    return (
      <DsrtEmpty
        title="Feed Unavailable"
        description={error}
        action={<DsrtButton onClick={() => loadPosts(false, null)}>Retry Connection</DsrtButton>}
      />
    )
  }

  if (posts.length === 0) {
    const msg = {
      'for-you': "Your personalized feed is being prepared. Interact with a few posts to help us understand what you like.",
      'latest': "No posts yet. Be the first to post something.",
      'ventures': "No venture updates right now. Follow ventures to see their posts here.",
      'projects': "No project updates right now. Follow projects to see their posts here.",
    }[tab] || "Nothing here yet."

    return <DsrtEmpty title="Feed is Empty" description={msg} />
  }

  return (
    <div className="w-full">
      <div className="relative min-h-0" aria-live="polite">
        {newPostsCount > 0 && (
          <div className="sticky top-[calc(var(--dsrt-nav-h)+52px)] z-20 flex justify-center pointer-events-none mb-4">
            <button
              onClick={loadNewPosts}
              className="pointer-events-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-black text-[12px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:bg-zinc-200 transition-all"
            >
              <ArrowUp size={12} weight="bold" />
              {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {posts.map((post, idx) => {
          if (!post || !post.id) return null
          return (
            <SafePostWrapper key={`post-${post.id}-${idx}`}>
              <HomePostCard post={post} currentUser={currentUser} />
            </SafePostWrapper>
          )
        })}
      </div>

      <div ref={observerRef} className="py-10 text-center">
        {loadingMore && (
          <div className="inline-flex items-center gap-2 text-[12px] font-mono uppercase tracking-wider text-white/40">
            <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            Loading more...
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-[12px] font-mono uppercase tracking-wider text-white/30">You're all caught up</p>
        )}
      </div>
    </div>
  )
}

function SafePostWrapper({ children }: { children: React.ReactNode }) {
  try { return <>{children}</> } catch { return null }
}