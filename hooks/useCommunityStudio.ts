'use client'

import { useCallback, useEffect, useState } from 'react'

async function safeGet<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json?.error?.code || 'FETCH_FAILED' }
    return { data: json?.data as T, error: null }
  } catch {
    return { data: null, error: 'NETWORK_ERROR' }
  }
}

export function useStudioOverview(slug: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await safeGet<any>(`/api/v1/community/${slug}/studio/overview`)
    setData(data)
    setError(error)
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useStudioMembers(slug: string, filters: { role?: string | null; status?: string | null; q?: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (reset: boolean) => {
    if (reset) { setLoading(true); setItems([]) } else { setLoadingMore(true) }
    const sp = new URLSearchParams()
    if (!reset && cursor) sp.set('cursor', cursor)
    if (filters.role) sp.set('role', filters.role)
    if (filters.status) sp.set('status', filters.status)
    if (filters.q) sp.set('q', filters.q)
    sp.set('limit', '30')
    const res = await fetch(`/api/v1/community/${slug}/studio/members?${sp.toString()}`, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok) {
      setError(json?.error?.code || 'FETCH_FAILED')
    } else {
      setItems((prev) => reset ? json?.data?.items || [] : [...prev, ...(json?.data?.items || [])])
      setCursor(json?.data?.next_cursor || null)
      setHasMore(!!json?.data?.has_more)
      setError(null)
    }
    setLoading(false)
    setLoadingMore(false)
  }, [slug, cursor, filters.role, filters.status, filters.q])

  useEffect(() => { load(true) /* eslint-disable-next-line */ }, [slug, filters.role, filters.status, filters.q])

  const patchItem = (membershipId: string, patch: any) => {
    setItems((prev) => prev.map((i) => (i.membership_id === membershipId ? { ...i, ...patch } : i)))
  }

  return { items, loading, loadingMore, hasMore, error, reload: () => load(true), loadMore: () => hasMore && !loadingMore && load(false), patchItem }
}

export function useStudioApplications(slug: string, status: string = 'SUBMITTED,UNDER_REVIEW') {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await safeGet<any>(`/api/v1/community/${slug}/studio/applications?status=${encodeURIComponent(status)}`)
    setItems(data?.items || [])
    setError(error)
    setLoading(false)
  }, [slug, status])

  useEffect(() => { load() }, [load])
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))
  return { items, loading, error, reload: load, removeItem }
}

export function useStudioInvitations(slug: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await safeGet<any>(`/api/v1/community/${slug}/studio/invitations`)
    setItems(data?.items || [])
    setError(error)
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])
  return { items, loading, error, reload: load }
}

export function useStudioAudit(slug: string) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(async (reset: boolean) => {
    if (reset) { setLoading(true); setItems([]) } else { setLoadingMore(true) }
    const sp = new URLSearchParams()
    if (!reset && cursor) sp.set('cursor', cursor)
    sp.set('limit', '40')
    const res = await fetch(`/api/v1/community/${slug}/studio/audit?${sp.toString()}`, { cache: 'no-store' })
    const json = await res.json()
    if (res.ok) {
      setItems((prev) => reset ? json?.data?.items || [] : [...prev, ...(json?.data?.items || [])])
      setCursor(json?.data?.next_cursor || null)
      setHasMore(!!json?.data?.has_more)
    }
    setLoading(false)
    setLoadingMore(false)
  }, [slug, cursor])

  useEffect(() => { load(true) /* eslint-disable-next-line */ }, [slug])
  return { items, loading, loadingMore, hasMore, reload: () => load(true), loadMore: () => hasMore && !loadingMore && load(false) }
}