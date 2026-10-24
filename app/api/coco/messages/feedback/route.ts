// ============================================================
// app/api/coco/messages/feedback/route.ts
// Like/dislike tracking for COCO messages.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      message_id,
      local_message_id,
      conversation_id,
      rating,
      reason,
    }: {
      message_id?: string
      local_message_id?: string
      conversation_id?: string
      rating: 1 | -1 | 0
      reason?: string
    } = body

    if (rating !== 1 && rating !== -1 && rating !== 0) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    if (!message_id && !local_message_id) {
      return NextResponse.json({ error: 'message_id or local_message_id required' }, { status: 400 })
    }

    // rating = 0 → delete existing feedback (unvote)
    if (rating === 0) {
      let query = supabase.from('coco_message_feedback').delete().eq('user_id', user.id)
      if (message_id) query = query.eq('message_id', message_id)
      else if (local_message_id) query = query.eq('local_message_id', local_message_id)
      await query
      return NextResponse.json({ ok: true, rating: 0 })
    }

    // Upsert vote
    const record: any = {
      user_id: user.id,
      rating,
      reason: reason || null,
      conversation_id: conversation_id || null,
    }
    if (message_id) record.message_id = message_id
    if (local_message_id) record.local_message_id = local_message_id

    const conflictTarget = message_id ? 'user_id,message_id' : 'user_id,local_message_id'

    const { error } = await supabase
      .from('coco_message_feedback')
      .upsert(record, { onConflict: conflictTarget })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, rating })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}