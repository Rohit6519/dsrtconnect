import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { startOrGetSubmission } from '@/lib/operations/service.forms'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const submission = await startOrGetSubmission(supabase, ctx.identityId, {
      form_id: id,
      parent_entity_type: body?.parent_entity_type,
      parent_entity_id: body?.parent_entity_id,
    })
    return ok({ submission }, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}