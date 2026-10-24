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

export function useCommunityEvents(slug: string) {
  const [data, setData] = useState<{ upcoming: any[]; past: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    const d = await getJson<any>(`/api/v1/community/${slug}/events`, { upcoming: [], past: [] })
    setData(d)
    setLoading(false)
  }, [slug])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useEvent(eventId: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/events/${eventId}`, null)
    setData(d)
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export function useEventRegistrations(eventId: string | null) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/events/${eventId}/registrations`, { items: [] })
    setItems(d?.items || [])
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  // Realtime updates
  useEffect(() => {
    if (!eventId) return
    const supabase = createClient()
    let ch: RealtimeChannel | null = supabase
      .channel('event_regs:' + eventId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_registrations', filter: `event_id=eq.${eventId}` },
        () => load()
      )
      .subscribe()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [eventId, load])

  return { items, loading, reload: load }
}

export function useEventAttendance(eventId: string | null) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!eventId) { setLoading(false); return }
    setLoading(true)
    const d = await getJson<any>(`/api/v1/events/${eventId}/attendance`, { items: [] })
    setItems(d?.items || [])
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!eventId) return
    const supabase = createClient()
    let ch: RealtimeChannel | null = supabase
      .channel('event_att:' + eventId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendance', filter: `event_id=eq.${eventId}` },
        () => load()
      )
      .subscribe()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [eventId, load])

  return { items, loading, reload: load }
}