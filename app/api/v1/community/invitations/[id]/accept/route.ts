// ============================================================
// app/api/v1/community/invitations/[id]/accept/route.ts
// Accept a pending invitation using its invitation ID.
// This is the IN-APP acceptance flow — the invited user opens the
// notification / invitations tab and clicks "Accept & Join".
//
// The email-token flow (POST /api/v1/communities/invitations/accept
// with { token }) still exists for links delivered by email.
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthContext,
  ok,
  fail,
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  StateConflictError,
} from '@/lib/kernel'
import { assertInvitationTransition } from '@/lib/community/state-machines'
import { incrementMemberCount } from '@/lib/community/service.community'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    const { id: invitationId } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    // 1. Load invitation
    const { data: invitation } = await supabase
      .from('community_invitations_v2')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle()

    if (!invitation) throw new NotFoundError('Invitation', invitationId)

    if (invitation.status !== 'PENDING') {
      throw new StateConflictError(`Invitation is ${invitation.status}`)
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('community_invitations_v2')
        .update({ status: 'EXPIRED' })
        .eq('id', invitation.id)
      throw new StateConflictError('Invitation has expired')
    }

    // 2. Ownership check — user must be the invitee
    if (invitation.invited_identity_id && invitation.invited_identity_id !== ctx.identityId) {
      throw new ForbiddenError('This invitation is not for you')
    }
    // Email-only invitations: match against the acting user's verified email
    if (!invitation.invited_identity_id && invitation.invited_email) {
      const { data: u } = await supabase
        .from('users')
        .select('email')
        .eq('id', ctx.identityId)
        .maybeSingle()
      if ((u?.email || '').toLowerCase() !== String(invitation.invited_email).toLowerCase()) {
        throw new ForbiddenError('This invitation is not for you')
      }
    }

    assertInvitationTransition(invitation.status, 'ACCEPTED')

    // 3. Load community for notifications / URL building
    const { data: community } = await supabase
      .from('communities')
      .select('id, name, slug, owner_identity_id')
      .eq('id', invitation.community_id)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', invitation.community_id)

    // 4. Activate / upsert membership
    const { data: existing } = await supabase
      .from('community_memberships')
      .select('id, status')
      .eq('community_id', invitation.community_id)
      .eq('identity_id', ctx.identityId)
      .maybeSingle()

    let membershipId: string
    let wasAlreadyActive = false
    if (existing) {
      wasAlreadyActive = existing.status === 'ACTIVE'
      await supabase
        .from('community_memberships')
        .update({
          status: 'ACTIVE',
          source: 'INVITATION',
          joined_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      membershipId = existing.id
    } else {
      const { data: created, error } = await supabase
        .from('community_memberships')
        .insert({
          community_id: invitation.community_id,
          identity_id: ctx.identityId,
          status: 'ACTIVE',
          source: 'INVITATION',
        })
        .select('id')
        .single()
      if (error) throw error
      membershipId = created.id
    }

    // 5. Resolve role → default to MEMBER if invitation didn't specify
    let roleIdToAssign: string | null = invitation.role_id ?? null
    if (!roleIdToAssign) {
      const { data: memberRole } = await supabase
        .from('community_roles')
        .select('id')
        .eq('community_id', invitation.community_id)
        .eq('role_key', 'MEMBER')
        .maybeSingle()
      roleIdToAssign = memberRole?.id ?? null
    }
    if (roleIdToAssign) {
      const { error: assignErr } = await supabase
        .from('community_membership_roles')
        .upsert(
          {
            membership_id: membershipId,
            role_id: roleIdToAssign,
            assigned_by: invitation.invited_by,
          },
          { onConflict: 'membership_id,role_id', ignoreDuplicates: true }
        )
      if (assignErr) console.warn('[invitation:accept_role_failed]', assignErr.message)
    }

    // 6. Legacy sync + counter
    await supabase
      .from('community_members')
      .upsert(
        {
          community_id: invitation.community_id,
          user_id: ctx.identityId,
          role: 'member',
        },
        { onConflict: 'community_id,user_id' }
      )

    if (!wasAlreadyActive) {
      await incrementMemberCount(supabase, invitation.community_id, 1)
    }

    // 7. Mark invitation accepted
    await supabase
      .from('community_invitations_v2')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    // 8. Membership event
    await supabase.from('community_membership_events').insert({
      membership_id: membershipId,
      community_id: invitation.community_id,
      identity_id: ctx.identityId,
      event_type: 'MEMBER_JOINED',
      actor_id: ctx.identityId,
      metadata: { source: 'INVITATION', invitation_id: invitation.id },
    })

    // 9. Audit + outbox
    await writeAudit(supabase, {
      actorId: ctx.identityId,
      action: 'community.invitation.accepted',
      entityType: 'community_invitation',
      entityId: invitation.id,
      scopeType: 'community',
      scopeId: invitation.community_id,
      requestId: ctx.requestId,
      after: { membership_id: membershipId, source: 'INVITATION' },
    })

    const event = createKernelEvent({
      eventType: KERNEL_EVENT_TYPES.COMMUNITY_INVITATION_ACCEPTED,
      aggregateType: 'community_invitation',
      aggregateId: invitation.id,
      actorId: ctx.identityId,
      payload: {
        community_id: invitation.community_id,
        identity_id: ctx.identityId,
        membership_id: membershipId,
      },
    })
    const eventId = await writeOutbox(supabase, event)

    // 10. Notify the inviter (best-effort)
    if (invitation.invited_by && invitation.invited_by !== ctx.identityId) {
      await createNotification(supabase, {
        recipientId: invitation.invited_by,
        type: 'community_invitation_accepted',
        priority: 'NORMAL',
        entityType: 'community_invitation',
        entityId: invitation.id,
        title: `Invitation accepted`,
        body: `Your invitation to ${community.name} was accepted.`,
        actionUrl: `/community/${community.slug}`,
        fromUserId: ctx.identityId,
        icon: 'check',
      })
    }

    return ok(
      {
        community_id: invitation.community_id,
        community_slug: community.slug,
        membership_id: membershipId,
      },
      { ctx, eventId }
    )
  } catch (err) {
    return fail(err, ctx)
  }
}