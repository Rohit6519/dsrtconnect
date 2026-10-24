'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PresenceState {
  user_id: string
  status: 'online' | 'idle' | 'offline'
  activity?: string
  project_id?: string
}

export function usePresence(projectId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map())

  useEffect(() => {
    const supabase = createClient()
    let currentUserId: string | null = null

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      currentUserId = user.id

      // Update own presence
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        status: 'online',
        current_page: window.location.pathname,
        project_id: projectId || null,
        last_seen: new Date().toISOString(),
      })

      // Subscribe to presence changes
      const channel = supabase
        .channel('presence-channel' + (projectId ? '-' + projectId : ''))
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence',
            ...(projectId ? { filter: `project_id=eq.${projectId}` } : {}),
          },
          (payload: any) => {
            setOnlineUsers(prev => {
              const next = new Map(prev)
              if (payload.eventType === 'DELETE') {
                next.delete(payload.old.user_id)
              } else {
                next.set(payload.new.user_id, payload.new)
              }
              return next
            })
          }
        )
        .subscribe()

      // Load initial state
      const query = supabase
        .from('user_presence')
        .select('*')
        .eq('status', 'online')

      if (projectId) query.eq('project_id', projectId)

      const { data } = await query
      if (data) {
        setOnlineUsers(new Map(data.map(p => [p.user_id, p])))
      }

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(async () => {
        await supabase.from('user_presence').upsert({
          user_id: user.id,
          status: 'online',
          current_page: window.location.pathname,
          project_id: projectId || null,
          last_seen: new Date().toISOString(),
        })
      }, 30000)

      // Set offline on unload
      const handleUnload = () => {
        supabase.from('user_presence').upsert({
          user_id: user.id,
          status: 'offline',
          last_seen: new Date().toISOString(),
        })
      }

      window.addEventListener('beforeunload', handleUnload)

      return () => {
        clearInterval(heartbeat)
        supabase.removeChannel(channel)
        window.removeEventListener('beforeunload', handleUnload)
        handleUnload()
      }
    }

    const cleanup = setup()
    return () => {
      cleanup.then(fn => fn?.())
    }
  }, [projectId])

  return { onlineUsers: Array.from(onlineUsers.values()) }
}