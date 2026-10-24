'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MAIL_EVENTS } from '@/lib/mail/mailEvents'

type Options = {
  channelKey: string
  enabled?: boolean
  debounceMs?: number
  onRefresh: () => void
  tables?: Array<'mail_messages' | 'mail_thread_participants' | 'mail_drafts'>
}

/**
 * Enterprise realtime binder:
 * - single channel per view key
 * - debounced refresh (no list flicker under write storms)
 * - also listens to window mail:refresh
 */
export function useMailRealtime({
  channelKey,
  enabled = true,
  debounceMs = 450,
  onRefresh,
  tables = ['mail_messages', 'mail_thread_participants', 'mail_drafts'],
}: Options) {
  const onRefreshRef = useRef(onRefresh)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || !channelKey) return

    const supabase = createClient()
    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onRefreshRef.current()
      }, debounceMs)
    }

    let channel = supabase.channel(`mail_rt_${channelKey}`)
    for (const table of tables) {
      channel = channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => schedule()
      )
    }
    channel.subscribe()

    const onWin = () => schedule()
    window.addEventListener(MAIL_EVENTS.refresh, onWin)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
      window.removeEventListener(MAIL_EVENTS.refresh, onWin)
    }
  }, [channelKey, enabled, debounceMs, tables.join('|')])
}