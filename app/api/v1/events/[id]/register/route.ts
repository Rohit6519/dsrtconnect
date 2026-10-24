import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { registerForEvent } from '@/lib/events/service.events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const result = await registerForEvent(
      supabase,
      ctx.identityId,
      id,
      body?.form_submission_id || null,
      ctx.requestId
    )
    return ok(result, { ctx, eventId: result.event_id, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}