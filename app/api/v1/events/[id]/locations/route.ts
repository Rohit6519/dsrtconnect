import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { setEventLocation } from '@/lib/events/service.events'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    await setEventLocation(supabase, ctx.identityId, id, body?.locations || [], ctx.requestId)
    return ok({ saved: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}