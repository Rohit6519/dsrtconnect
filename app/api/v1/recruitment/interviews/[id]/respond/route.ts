import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { respondToInterview } from '@/lib/recruitment/service.interviews'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!['ACCEPTED', 'DECLINED', 'TENTATIVE'].includes(body?.response)) {
      throw new ValidationError([{ field: 'response', message: 'Invalid response' }])
    }
    await respondToInterview(supabase, ctx.identityId, id, body.response, ctx.requestId)
    return ok({ response: body.response }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}