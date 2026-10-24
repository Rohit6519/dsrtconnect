import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, ForbiddenError, NotFoundError, StateConflictError } from '@/lib/kernel'
import { declineInvitation } from '@/lib/community/network'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const result = await declineInvitation(supabase, ctx.identityId, id)
    if (!result.ok) {
      if (result.reason === 'not_found') throw new NotFoundError('Invitation', id)
      if (result.reason === 'forbidden') throw new ForbiddenError('Not your invitation')
      if (result.reason === 'not_pending') throw new StateConflictError('Invitation is not pending')
    }

    return ok({ success: true, invitation_id: id }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}