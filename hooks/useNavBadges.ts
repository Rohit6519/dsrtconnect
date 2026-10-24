import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNavBadges(userId?: string) {
  const [badges, setBadges] = useState({ messages: 0, invitations: 0, inbox: 0 })
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    const loadBadges = async () => {
      try {
        const [msgRes, invRes, inboxRes] = await Promise.all([
          supabase
            .from('conversation_participants')
            .select('conversation_id, last_read_at, conversations:conversation_id(last_message_at)')
            .eq('user_id', userId),
          supabase
            .from('organization_invitations')
            .select('id', { count: 'exact', head: true })
            .eq('invited_user_id', userId)
            .eq('status', 'pending'),
          fetch('/api/inbox/count').then(r => r.json()).catch(() => ({ count: 0 })),
        ])

        let unread = 0
        ;(msgRes.data || []).forEach((cp: any) => {
          const lm = cp.conversations?.last_message_at
          if (lm && (!cp.last_read_at || new Date(lm) > new Date(cp.last_read_at))) unread++
        })

        setBadges({
          messages: unread,
          invitations: invRes.count || 0,
          inbox: inboxRes.count || 0,
        })
      } catch {
        // silent fail
      }
    }

    loadBadges()
    const interval = setInterval(loadBadges, 15000)
    return () => clearInterval(interval)
  }, [userId, supabase])

  return badges
}