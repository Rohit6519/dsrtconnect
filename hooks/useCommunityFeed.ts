'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useStableCallback } from './useStableCallback'
import { useDebouncedCallback } from './useDebouncedCallback'

export function useCommunityFeed(slug: string, communityId: string | undefined) {
  const [items, setItems] = useState<any[]>([])
  const [pinned, setPinned] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cursor lives in a ref — load() has a stable identity so effects don't reconnect.
  const cursorRef = useRef<string | null>(null)

  const load = useStableCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true)
      setItems([])
      cursorRef.current = null
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const sp = new URLSearchParams()
      if (!reset && cursorRef.current) sp.set('cursor', cursorRef.current)
      sp.set('limit', '20')

      const res = await fetch(`/api/v1/community/${slug}/feed?${sp.toString()}`, { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.code || 'FETCH_FAILED')
        return
      }

      const data = json?.data
      if (reset) {
        setItems(data?.items || [])
        setPinned(data?.pinned || [])
        setAnnouncements(data?.announcements || [])
      } else {
        setItems((prev) => [...prev, ...(data?.items || [])])
      }
      cursorRef.current = data?.next_cursor || null
      setHasMore(!!data?.has_more)
    } catch {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  })

  // Initial + slug-change load
  useEffect(() => {
    load(true)
  }, [slug, load])

  // Debounced realtime reconciliation — coalesces 10 events in 3s into 1 refetch
  const debouncedReconcile = useDebouncedCallback(() => {
    load(true)
  }, 3000)

  useEffect(() => {
    if (!communityId) return
    const supabase = createClient()

    const channel: RealtimeChannel = supabase
      .channel('community_feed:' + communityId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_posts_v2',
          filter: `community_id=eq.${communityId}`,
        },
        () => debouncedReconcile()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_announcements',
          filter: `community_id=eq.${communityId}`,
        },
        () => debouncedReconcile()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId, debouncedReconcile])

  return {
    items,
    pinned,
    announcements,
    loading,
    loadingMore,
    hasMore,
    error,
    reload: () => load(true),
    loadMore: () => {
      if (hasMore && !loadingMore) load(false)
    },
    prependPost: (post: any) => setItems((prev) => [post, ...prev]),
    removePost: (id: string) => setItems((prev) => prev.filter((p) => p.id !== id)),
  }
}