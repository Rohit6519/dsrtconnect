import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { transitionEventStatus } from '@/lib/community/service.events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const result = await transitionEventStatus(supabase, ctx.identityId, id, 'CANCELLED', body?.reason, ctx.requestId)
    return ok(result, { ctx, eventId: result.event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}