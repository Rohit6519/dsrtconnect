// ============================================================
// app/api/coco/conversations/[id]/pin/route.ts
// Pin or unpin a conversation to keep it beyond 48h.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const pin = body?.pin !== false // default true

    const { error } = await supabase
      .from('coco_conversations')
      .update({
        is_pinned: pin,
        pinned_at: pin ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, pinned: pin })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}