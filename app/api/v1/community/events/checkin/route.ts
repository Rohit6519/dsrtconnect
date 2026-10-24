import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { checkinByToken } from '@/lib/community/service.events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.token) throw new ValidationError([{ field: 'token', message: 'Required' }])
    const result = await checkinByToken(supabase, ctx.identityId, body.token, {
      device_id: body?.device_id,
      method: body?.method || 'QR',
    })
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}