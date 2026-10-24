'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useEventDetail(idOrSlug: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/community/events/${encodeURIComponent(idOrSlug)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.code || 'FETCH_FAILED'); return }
      setData(json?.data)
    } catch {
      setError('NETWORK_ERROR')
    } finally {
      setLoading(false)
    }
  }, [idOrSlug])

  useEffect(() => { load() }, [load])

  // Realtime for config counts + own registration
  useEffect(() => {
    if (!data?.event?.id) return
    const supabase = createClient()
    const eventId = data.event.id
    let channel: RealtimeChannel | null = supabase
      .channel('event_detail:' + eventId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_event_registration_config', filter: `event_id=eq.${eventId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_event_registrations', filter: `event_id=eq.${eventId}` }, () => load())
      .subscribe()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [data?.event?.id, load])

  return { data, loading, error, reload: load }
}

export function useEventRegistrations(eventId: string | null, status: string = 'ALL') {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/community/events/${eventId}/registrations?status=${status}&limit=100`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error?.code || 'FETCH_FAILED'); return }
      setItems(json?.data?.items || [])
    } finally {
      setLoading(false)
    }
  }, [eventId, status])

  useEffect(() => { load() }, [load])
  return { items, loading, error, reload: load }
}