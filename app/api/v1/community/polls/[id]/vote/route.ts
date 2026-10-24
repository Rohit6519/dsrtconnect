import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { castPollVote } from '@/lib/community/service.polls'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body.option_id) throw new ValidationError([{ field: 'option_id', message: 'Required' }])
    const result = await castPollVote(supabase, ctx.identityId, id, body.option_id, ctx.requestId)
    return ok(result, { ctx, eventId: result.event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}