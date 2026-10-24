import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { createEvent } from '@/lib/community/service.events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const result = await createEvent(supabase, ctx.identityId, body, ctx.requestId)
    return ok(result, { ctx, eventId: result.event_id, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}