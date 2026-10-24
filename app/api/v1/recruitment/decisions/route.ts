import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { recordDecision } from '@/lib/recruitment/service.decisions'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.application_id) throw new ValidationError([{ field: 'application_id', message: 'Required' }])
    if (!body?.decision_type) throw new ValidationError([{ field: 'decision_type', message: 'Required' }])
    const result = await recordDecision(supabase, ctx.identityId, body, ctx.requestId)
    return ok(result, { ctx, eventId: result.event_id, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}