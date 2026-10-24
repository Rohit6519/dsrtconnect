import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ForbiddenError, StateConflictError, writeAudit, writeOutbox, createKernelEvent } from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from '@/lib/community/permissions'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: invitation } = await supabase
      .from('community_invitations_v2')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!invitation) throw new NotFoundError('Invitation', id)
    if (invitation.status !== 'PENDING') throw new StateConflictError(`Invitation is ${invitation.status}`)

    const canRevoke = await hasCommunityPermission(
      supabase,
      ctx.identityId,
      invitation.community_id,
      COMMUNITY_PERMISSIONS.INVITATION_REVOKE
    )
    if (!canRevoke && invitation.invited_by !== ctx.identityId) {
      throw new ForbiddenError('Cannot revoke this invitation')
    }

    await supabase
      .from('community_invitations_v2')
      .update({ status: 'REVOKED', revoked_at: new Date().toISOString() })
      .eq('id', id)

    await writeAudit(supabase, {
      actorId: ctx.identityId,
      action: 'community.invitation.revoked',
      entityType: 'community_invitation',
      entityId: id,
      scopeType: 'community',
      scopeId: invitation.community_id,
      requestId: ctx.requestId,
      after: { status: 'REVOKED' },
    })

    const event = createKernelEvent({
      eventType: 'community.invitation.revoked',
      aggregateType: 'community_invitation',
      aggregateId: id,
      actorId: ctx.identityId,
      payload: { community_id: invitation.community_id, invitation_id: id },
    })
    const eventId = await writeOutbox(supabase, event)

    return ok({ revoked: true }, { ctx, eventId })
  } catch (err) {
    return fail(err, ctx)
  }
}