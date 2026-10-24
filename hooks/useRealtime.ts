'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Lightweight realtime subscription helper.
 * Safe no-op wrapper so imports never resolve to undefined.
 */
export function useRealtime(
  channelName: string,
  handlers: Array<{
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    table: string
    schema?: string
    callback: (payload: any) => void
  }>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !channelName || !handlers?.length) return

    const supabase = createClient()
    let channel = supabase.channel(channelName)

    handlers.forEach((h) => {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: h.event,
          schema: h.schema || 'public',
          table: h.table,
        },
        h.callback
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, enabled, JSON.stringify(handlers.map((h) => [h.event, h.table, h.schema]))])
}

export default useRealtime