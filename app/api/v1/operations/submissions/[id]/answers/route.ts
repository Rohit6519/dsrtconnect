import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { saveAnswers } from '@/lib/operations/service.forms'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const answers = Array.isArray(body?.answers) ? body.answers : []
    const result = await saveAnswers(supabase, ctx.identityId, id, answers)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}