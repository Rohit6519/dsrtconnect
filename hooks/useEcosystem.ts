'use client'

import { useCallback, useEffect, useState } from 'react'

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) return fallback
    return (json?.data ?? fallback) as T
  } catch { return fallback }
}

export function useEcosystemActivity(limit = 20) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (reset: boolean) => {
    if (reset) { setLoading(true); setItems([]) } else { setLoadingMore(true) }
    const sp = new URLSearchParams({ limit: String(limit) })
    if (!reset && cursor) sp.set('cursor', cursor)
    const d = await getJson<any>(`/api/v1/ecosystem/activity?${sp.toString()}`, { items: [], has_more: false })
    setItems(prev => reset ? d.items || [] : [...prev, ...(d.items || [])])
    setCursor(d.next_cursor || null)
    setHasMore(!!d.has_more)
    setLoading(false)
    setLoadingMore(false)
  }, [cursor, limit])

  useEffect(() => { load(true) }, [])
  return { items, loading, loadingMore, hasMore, reload: () => load(true), loadMore: () => hasMore && !loadingMore && load(false) }
}

export function useRecommendations(type = 'community', limit = 12) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const d = await getJson<any>(`/api/v1/ecosystem/recommendations?type=${type}&limit=${limit}`, { items: [] })
    setItems(d?.items || [])
    setLoading(false)
  }, [type, limit])
  useEffect(() => { load() }, [load])
  return { items, loading, reload: load }
}

export function useCommunityAnalytics(communityId: string | null, days = 30) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!communityId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/ecosystem/analytics/community/${communityId}?days=${days}`, null)
    setData(d)
    setLoading(false)
  }, [communityId, days])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}