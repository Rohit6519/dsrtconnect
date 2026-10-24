import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, ValidationError } from '@/lib/kernel'
import { scanCheckin } from '@/lib/events/service.checkin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.token) throw new ValidationError([{ field: 'token', message: 'Required' }])
    const result = await scanCheckin(supabase, ctx.identityId, body.token, body.device_id, ctx.requestId)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}