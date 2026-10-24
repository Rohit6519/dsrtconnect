import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { closeListing } from '@/lib/looking-for/service.listings'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!['CLOSED', 'FILLED', 'PAUSED', 'ARCHIVED'].includes(body?.status)) {
      throw new ValidationError([{ field: 'status', message: 'Invalid target status' }])
    }
    await closeListing(supabase, ctx.identityId, id, body.status, ctx.requestId)
    return ok({ status: body.status }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}