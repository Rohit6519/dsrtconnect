import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { manualCheckin } from '@/lib/events/service.checkin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.registration_id) throw new ValidationError([{ field: 'registration_id', message: 'Required' }])
    const result = await manualCheckin(supabase, ctx.identityId, id, body.registration_id, ctx.requestId)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}