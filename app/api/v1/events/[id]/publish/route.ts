import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { publishEvent } from '@/lib/events/service.events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const result = await publishEvent(supabase, ctx.identityId, id, ctx.requestId)
    return ok(result, { ctx, eventId: result.outbox_event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}