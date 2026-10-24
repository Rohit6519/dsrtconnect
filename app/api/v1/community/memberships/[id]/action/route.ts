import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { memberAction } from '@/lib/community/service.studio'

export const dynamic = 'force-dynamic'

const ALLOWED = ['suspend', 'unsuspend', 'ban', 'unban', 'remove', 'reinstate'] as const

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    if (!body.action || !ALLOWED.includes(body.action)) {
      throw new ValidationError([{ field: 'action', message: `Must be one of: ${ALLOWED.join(', ')}` }])
    }

    const result = await memberAction(
      supabase,
      ctx.identityId,
      id,
      body.action,
      body.reason,
      ctx.requestId
    )

    return ok(result, { ctx, eventId: result.event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}