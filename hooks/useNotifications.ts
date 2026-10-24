'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useStableCallback } from './useStableCallback'
import { useDebouncedCallback } from './useDebouncedCallback'

export interface Notification {
  id: string
  recipient_id: string
  user_id?: string
  type: string
  priority?: string
  entity_type?: string | null
  entity_id?: string | null
  title: string
  body?: string | null
  message?: string | null
  action_url?: string | null
  read?: boolean
  read_at?: string | null
  created_at: string
  from_user_id?: string | null
  icon?: string | null
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userIdRef = useRef<string | null>(null)

  // Server-authoritative count — this is the truth for the badge
  const fetchUnreadCount = useStableCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications/count', { cache: 'no-store' })
      const json = await res.json()
      const unread = Number(json?.data?.unread ?? 0)
      setUnreadCount(Number.isFinite(unread) ? unread : 0)
    } catch (e) {
      console.warn('[useNotifications:count_failed]', e)
    }
  })

  // Debounced reconciliation for realtime updates — collapses 20 UPDATE events into one count query
  const debouncedReconcileCount = useDebouncedCallback(() => {
    fetchUnreadCount()
  }, 5000)

  const fetchNotifications = useStableCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      userIdRef.current = user.id

      const [listRes] = await Promise.all([
        fetch('/api/v1/notifications?limit=30', { cache: 'no-store' }),
        fetchUnreadCount(),
      ])

      const json = await listRes.json()
      if (json?.data?.items) {
        setNotifications(json.data.items as Notification[])
      }
    } catch (e) {
      console.error('[useNotifications:fetch_failed]', e)
    } finally {
      setLoading(false)
    }
  })

  const markAsRead = useStableCallback(async (id: string) => {
    let wasUnread = false
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          wasUnread = !(n.read || n.read_at)
          return { ...n, read: true, read_at: new Date().toISOString() }
        }
        return n
      })
    )
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1))

    try {
      const res = await fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) fetchUnreadCount()
    } catch (e) {
      console.error('[useNotifications:mark_read_failed]', e)
      fetchUnreadCount()
    }
  })

  const markAllAsRead = useStableCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
    )
    setUnreadCount(0)

    try {
      const res = await fetch('/api/v1/notifications/read-all', { method: 'POST' })
      if (!res.ok) fetchUnreadCount()
    } catch (e) {
      console.error('[useNotifications:mark_all_read_failed]', e)
      fetchUnreadCount()
    }
  })

  useEffect(() => {
    let mounted = true

    const setup = async () => {
      await fetchNotifications()
      if (!mounted) return

      const uid = userIdRef.current
      if (!uid) return

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const channel = supabase
        .channel('notifications:' + uid)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${uid}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications((prev) => [newNotif, ...prev].slice(0, 50))
            if (!newNotif.read_at && !newNotif.read) {
              setUnreadCount((prev) => prev + 1)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${uid}`,
          },
          (payload) => {
            const updated = payload.new as Notification
            // Optimistically merge the row itself (paint is instant)
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            )
            // Debounce the badge reconcile — no per-event count query
            debouncedReconcileCount()
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') channelRef.current = channel
        })
    }

    setup()

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase, fetchNotifications, debouncedReconcileCount])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    refetchCount: fetchUnreadCount,
  }
}