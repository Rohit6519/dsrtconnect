import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, requireAuthContext, ok, fail } from '@/lib/kernel'
import { getEvent, updateEventDraft } from '@/lib/events/service.events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const data = await getEvent(supabase, id)
    return ok(data, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const data = await updateEventDraft(supabase, ctx.identityId, id, body, ctx.requestId)
    return ok(data, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}