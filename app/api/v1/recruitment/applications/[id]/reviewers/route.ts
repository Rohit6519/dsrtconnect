import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ValidationError } from '@/lib/kernel'
import { assignReviewer, removeReviewer } from '@/lib/recruitment/service.reviewers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.reviewer_id) throw new ValidationError([{ field: 'reviewer_id', message: 'Required' }])
    const result = await assignReviewer(supabase, ctx.identityId, id, body.reviewer_id, body.role, ctx.requestId)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    if (!body?.reviewer_id) throw new ValidationError([{ field: 'reviewer_id', message: 'Required' }])
    await removeReviewer(supabase, ctx.identityId, id, body.reviewer_id, ctx.requestId)
    return ok({ removed: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}