import { SupabaseClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import { writeAudit, writeOutbox, createKernelEvent, createNotification, KERNEL_EVENT_TYPES, NotFoundError, ForbiddenError, ValidationError, StateConflictError } from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from './permissions'
import { assertInvitationTransition } from './state-machines'

export interface CreateInvitationInput {
  invited_identity_id?: string
  invited_email?: string
  role_key?: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  message?: string
}

function generateInvitationToken() {
  const raw = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  const preview = raw.slice(0, 8)
  return { raw, hash, preview }
}

export async function createInvitation(supabase: SupabaseClient, actorId: string, communityId: string, input: CreateInvitationInput, requestId?: string): Promise<{ invitation_id: string; raw_token: string; event_id: string }> {
  if (!input.invited_identity_id && !input.invited_email) throw new ValidationError([{ field: 'invited', message: 'Missing invited_identity_id or email' }])
  const allowed = await hasCommunityPermission(supabase, actorId, communityId, COMMUNITY_PERMISSIONS.INVITATION_CREATE)
  if (!allowed) throw new ForbiddenError('Permission denied')

  const { data: community } = await supabase.from('communities').select('id, name, slug').eq('id', communityId).maybeSingle()
  if (!community) throw new NotFoundError('Community', communityId)

  const roleKey = input.role_key ?? 'MEMBER'
  const { data: role } = await supabase.from('community_roles').select('id').eq('community_id', communityId).eq('role_key', roleKey).maybeSingle()
  const { raw, hash, preview } = generateInvitationToken()

  const { data: invitation, error } = await supabase.from('community_invitations_v2').insert({ community_id: communityId, invited_identity_id: input.invited_identity_id ?? null, invited_email: input.invited_email ?? null, invited_by: actorId, role_id: role?.id ?? null, token_hash: hash, token_preview: preview, message: input.message ?? null, status: 'PENDING' }).select('*').single()
  if (error) throw error

  await writeAudit(supabase, { actorId, action: 'community.invitation.created', entityType: 'community_invitation', entityId: invitation.id, scopeType: 'community', scopeId: communityId, requestId, after: { invited_identity_id: input.invited_identity_id, invited_email: input.invited_email, role_key: roleKey } })

  const event = createKernelEvent({ eventType: KERNEL_EVENT_TYPES.COMMUNITY_INVITATION_CREATED, aggregateType: 'community_invitation', aggregateId: invitation.id, actorId, payload: { community_id: communityId, community_slug: community.slug, community_name: community.name, invitation_id: invitation.id, invited_identity_id: input.invited_identity_id, invited_email: input.invited_email } })
  const eventId = await writeOutbox(supabase, event)

  if (input.invited_identity_id) {
    await createNotification(supabase, { recipientId: input.invited_identity_id, type: 'community_invitation', priority: 'NORMAL', entityType: 'community_invitation', entityId: invitation.id, title: `Invited to ${community.name}`, body: input.message || 'Tap to view', actionUrl: `/community/invite/${raw}`, fromUserId: actorId, icon: 'user' })
  }
  return { invitation_id: invitation.id, raw_token: raw, event_id: eventId }
}

export async function acceptInvitation(supabase: SupabaseClient, actorId: string, rawToken: string, requestId?: string): Promise<{ community_id: string; membership_id: string; event_id: string }> {
  const hash = createHash('sha256').update(rawToken).digest('hex')
  const { data: invitation } = await supabase.from('community_invitations_v2').select('*').eq('token_hash', hash).maybeSingle()
  if (!invitation) throw new NotFoundError('Invitation')
  if (invitation.status !== 'PENDING') throw new StateConflictError(`Invitation is ${invitation.status}`)
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase.from('community_invitations_v2').update({ status: 'EXPIRED' }).eq('id', invitation.id)
    throw new StateConflictError('Invitation expired')
  }

  assertInvitationTransition(invitation.status as any, 'ACCEPTED')

  const { data: existing } = await supabase.from('community_memberships').select('id, status').eq('community_id', invitation.community_id).eq('identity_id', actorId).maybeSingle()
  let membershipId: string
  if (existing) {
    await supabase.from('community_memberships').update({ status: 'ACTIVE', source: 'INVITATION', joined_at: new Date().toISOString() }).eq('id', existing.id)
    membershipId = existing.id
  } else {
    const { data: created, error } = await supabase.from('community_memberships').insert({ community_id: invitation.community_id, identity_id: actorId, status: 'ACTIVE', source: 'INVITATION' }).select('id').single()
    if (error) throw error
    membershipId = created.id
  }

  const roleIdToAssign = invitation.role_id ?? (await supabase.from('community_roles').select('id').eq('community_id', invitation.community_id).eq('role_key', 'MEMBER').maybeSingle().then(r => r.data?.id))
  if (roleIdToAssign) {
    await supabase.from('community_membership_roles').upsert({ membership_id: membershipId, role_id: roleIdToAssign, assigned_by: invitation.invited_by })
  }

  await supabase.from('community_members').upsert({ community_id: invitation.community_id, user_id: actorId, role: 'member' }, { onConflict: 'community_id,user_id' })
  await supabase.from('community_invitations_v2').update({ status: 'ACCEPTED', accepted_at: new Date().toISOString() }).eq('id', invitation.id)
  await supabase.from('community_membership_events').insert({ membership_id: membershipId, community_id: invitation.community_id, identity_id: actorId, event_type: 'MEMBER_JOINED', actor_id: actorId, metadata: { source: 'INVITATION', invitation_id: invitation.id } })
  await writeAudit(supabase, { actorId, action: 'community.invitation.accepted', entityType: 'community_invitation', entityId: invitation.id, scopeType: 'community', scopeId: invitation.community_id, requestId, after: { membership_id: membershipId } })

  const event = createKernelEvent({ eventType: KERNEL_EVENT_TYPES.COMMUNITY_INVITATION_ACCEPTED, aggregateType: 'community_invitation', aggregateId: invitation.id, actorId, payload: { community_id: invitation.community_id, identity_id: actorId, membership_id: membershipId } })
  const eventId = await writeOutbox(supabase, event)
  return { community_id: invitation.community_id, membership_id: membershipId, event_id: eventId }
}