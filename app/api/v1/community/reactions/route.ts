import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { toggleReaction } from '@/lib/community/service.comments'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const result = await toggleReaction(supabase, ctx.identityId, body, ctx.requestId)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}