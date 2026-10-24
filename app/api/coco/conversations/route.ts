// ============================================================
// app/api/coco/conversations/route.ts
// Standard REST endpoints for managing conversation history.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { handler, ok } from '@/lib/kernel/response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = handler(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('COCO_UNAUTHENTICATED')

  const { data } = await supabase
    .from('coco_conversations')
    .select('id, title, status, message_count, last_message_at, last_message_preview, updated_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(50)

  return ok({ conversations: data || [] })
})