import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { deleteReviewerNote } from '@/lib/recruitment/service.reviewers'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    await deleteReviewerNote(supabase, ctx.identityId, id, ctx.requestId)
    return ok({ deleted: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}