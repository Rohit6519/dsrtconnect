'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useModerationQueue(slug: string, filters: { status?: string; priority?: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (reset: boolean) => {
    if (reset) { setLoading(true); setItems([]) } else { setLoadingMore(true) }
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (!reset && cursor) sp.set('cursor', cursor)
      if (filters.status) sp.set('status', filters.status)
      if (filters.priority) sp.set('priority', filters.priority)
      sp.set('limit', '30')
      const res = await fetch(`/api/v1/community/${slug}/studio/moderation/cases?${sp.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.code || 'FETCH_FAILED'); return }
      const page = json?.data
      setItems((prev) => reset ? page?.items || [] : [...prev, ...(page?.items || [])])
      setCursor(page?.next_cursor || null)
      setHasMore(!!page?.has_more)
    } catch { setError('NETWORK_ERROR') }
    finally { setLoading(false); setLoadingMore(false) }
  }, [slug, cursor, filters.status, filters.priority])

  useEffect(() => { load(true) /* eslint-disable-next-line */ }, [slug, filters.status, filters.priority])
  return { items, loading, loadingMore, hasMore, error, reload: () => load(true), loadMore: () => hasMore && !loadingMore && load(false) }
}

export function useModerationCase(caseId: string | null) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!caseId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/community/moderation/cases/${caseId}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.code || 'FETCH_FAILED'); return }
      setDetail(json?.data)
    } catch { setError('NETWORK_ERROR') }
    finally { setLoading(false) }
  }, [caseId])

  useEffect(() => { load() }, [load])
  return { detail, loading, error, reload: load }
}

export function useAppealsInbox(slug: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/community/${slug}/studio/moderation/appeals`, { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setItems(json?.data?.items || [])
    } finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])
  return { items, loading, reload: load }
}