'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) return fallback
    return (json?.data ?? fallback) as T
  } catch { return fallback }
}

export function useCommunityListings(slug: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const d = await getJson<any>(`/api/v1/community/${slug}/looking-for`, { items: [] })
    setItems(d?.items || [])
    setLoading(false)
  }, [slug])
  useEffect(() => { load() }, [load])
  return { items, loading, reload: load }
}

export function useListing(listingId: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!listingId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/looking-for/${listingId}`, null)
    setData(d)
    setLoading(false)
  }, [listingId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useApplicationDetail(applicationId: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    if (!applicationId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/recruitment/applications/${applicationId}`, null)
    setData(d)
    setLoading(false)
  }, [applicationId])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useListingApplications(listingId: string | null, stage?: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (reset: boolean) => {
    if (!listingId) { setLoading(false); return }
    if (reset) { setLoading(true); setItems([]) } else { setLoadingMore(true) }
    const sp = new URLSearchParams()
    if (!reset && cursor) sp.set('cursor', cursor)
    if (stage) sp.set('stage', stage)
    sp.set('limit', '30')
    const d = await getJson<any>(`/api/v1/looking-for/${listingId}/applications?${sp.toString()}`, { items: [], has_more: false })
    setItems(prev => reset ? d.items || [] : [...prev, ...(d.items || [])])
    setCursor(d.next_cursor || null)
    setHasMore(!!d.has_more)
    setLoading(false)
    setLoadingMore(false)
  }, [listingId, cursor, stage])

  useEffect(() => { load(true) }, [listingId, stage])

  // Realtime
  useEffect(() => {
    if (!listingId) return
    const supabase = createClient()
    let ch: RealtimeChannel | null = supabase
      .channel('listing_apps:' + listingId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'looking_for_applications', filter: `listing_id=eq.${listingId}` }, () => load(true))
      .subscribe()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [listingId, load])

  return { items, loading, loadingMore, hasMore, reload: () => load(true), loadMore: () => hasMore && !loadingMore && load(false) }
}