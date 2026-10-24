import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { setEventSchedule } from '@/lib/events/service.events'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    await setEventSchedule(supabase, ctx.identityId, id, body?.schedules || [], ctx.requestId)
    return ok({ saved: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}