import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { decideAppeal } from '@/lib/community/service.moderation'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (body.decision !== 'UPHELD' && body.decision !== 'OVERTURNED') {
      throw new ValidationError([{ field: 'decision', message: 'Must be UPHELD or OVERTURNED' }])
    }
    await decideAppeal(supabase, ctx.identityId, id, body.decision, body.reason, ctx.requestId)
    return ok({ decided: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}