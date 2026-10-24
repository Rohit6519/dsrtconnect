'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function MarkAllRead() {
  const router = useRouter()
  const supabase = createClient()

  const markAll = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={markAll}>
      Mark all read
    </Button>
  )
}