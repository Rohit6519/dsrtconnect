'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface NetworkSummary {
  joined_count: number
  following_count: number
  pending_invitation_count: number
  peers_count: number
}

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return fallback
    const json = await res.json()
    return (json?.data ?? fallback) as T
  } catch {
    return fallback
  }
}

export function useNetworkSummary() {
  const [summary, setSummary] = useState<NetworkSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await safeFetch<NetworkSummary>('/api/v1/community/network/summary', {
      joined_count: 0,
      following_count: 0,
      pending_invitation_count: 0,
      peers_count: 0,
    })
    setSummary(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { summary, loading, reload: load }
}

export function useBucketCommunities(bucket: 'joined' | 'following' | 'invited' | 'past') {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/community/network/communities?bucket=${bucket}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.code || 'FETCH_FAILED')
        setItems([])
        return
      }
      setItems(json?.data?.items || [])
    } catch (e: any) {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
    }
  }, [bucket])

  useEffect(() => {
    load()
  }, [load])

  const removeItem = (predicate: (item: any) => boolean) => {
    setItems((prev) => prev.filter((it) => !predicate(it)))
  }

  return { items, loading, error, reload: load, removeItem }
}

export function useNetworkPeople() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true)
      setItems([])
    } else {
      setLoadingMore(true)
    }
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (!reset && cursor) sp.set('cursor', cursor)
      const res = await fetch(`/api/v1/community/network/people?${sp.toString()}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.code || 'FETCH_FAILED')
        return
      }
      const page = json?.data
      setItems((prev) => (reset ? page?.items || [] : [...prev, ...(page?.items || [])]))
      setCursor(page?.next_cursor || null)
      setHasMore(!!page?.has_more)
    } catch {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor])

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = () => {
    if (hasMore && !loadingMore) load(false)
  }

  return { items, loading, loadingMore, hasMore, error, reload: () => load(true), loadMore }
}

export function useNetworkActivity() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true)
      setItems([])
    } else {
      setLoadingMore(true)
    }
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (!reset && cursor) sp.set('cursor', cursor)
      const res = await fetch(`/api/v1/community/network/activity?${sp.toString()}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.code || 'FETCH_FAILED')
        return
      }
      const page = json?.data
      setItems((prev) => (reset ? page?.items || [] : [...prev, ...(page?.items || [])]))
      setCursor(page?.next_cursor || null)
      setHasMore(!!page?.has_more)
    } catch {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [cursor])

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Realtime: subscribe to new activity rows for communities the user is a member of
  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let active = true

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      channel = supabase
        .channel('network_activity:' + user.id)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_activity_projection',
          },
          () => {
            // Simple strategy: refetch first page to guarantee correctness/enrichment.
            load(true)
          }
        )
        .subscribe()
    }

    setup()
    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [load])

  const loadMore = () => {
    if (hasMore && !loadingMore) load(false)
  }

  return { items, loading, loadingMore, hasMore, error, reload: () => load(true), loadMore }
}