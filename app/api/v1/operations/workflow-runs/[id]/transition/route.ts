import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { transitionRun } from '@/lib/operations/service.workflows'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.transition_key) throw new ValidationError([{ field: 'transition_key', message: 'Required' }])
    const result = await transitionRun(supabase, ctx.identityId, id, body.transition_key, body.reason, ctx.requestId)
    return ok(result, { ctx, eventId: result.event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}