import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/kernel'
import { hashToken } from './service.events'

export async function scanCheckin(
  supabase: SupabaseClient,
  actorId: string | null,
  rawToken: string,
  deviceId: string | undefined,
  requestId?: string
) {
  if (!rawToken?.trim()) throw new ValidationError([{ field: 'token', message: 'Token required' }])
  const tokenHash = hashToken(rawToken.trim())

  const { data, error } = await supabase.rpc('rpc_event_checkin', {
    p_token_hash: tokenHash,
    p_actor_id: actorId,
    p_device_id: deviceId || null,
  })
  if (error) throw new Error(error.message)
  const result = data as any

  await writeAudit(supabase, {
    actorId,
    action: result.already_checked_in ? 'event.checkin.duplicate_scan' : 'event.checkin.recorded',
    entityType: 'event_attendance',
    entityId: result.attendance_id,
    requestId,
    metadata: { device_id: deviceId },
  })

  if (!result.already_checked_in) {
    const evt = createKernelEvent({
      eventType: 'event.attendance.recorded',
      aggregateType: 'event_attendance',
      aggregateId: result.attendance_id,
      actorId,
      payload: {
        registration_number: result.registration_number,
        identity_id: result.identity_id,
        checked_in_at: result.checked_in_at,
      },
    })
    await writeOutbox(supabase, evt)
  }

  return result
}

export async function manualCheckin(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  registrationId: string,
  requestId?: string
) {
  // Verify actor is event admin
  const { data: event } = await supabase.from('event_events').select('community_id, owner_identity_id').eq('id', eventId).maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)
  if (event.owner_identity_id !== actorId) {
    const { data: cm } = await supabase
      .from('community_memberships')
      .select('id')
      .eq('community_id', event.community_id)
      .eq('identity_id', actorId)
      .eq('status', 'ACTIVE')
      .maybeSingle()
    if (!cm) throw new ForbiddenError('Not allowed')
    const { data: roles } = await supabase
      .from('community_membership_roles')
      .select('community_roles(role_key)')
      .eq('membership_id', cm.id)
    const keys = new Set((roles || []).map((r: any) => r.community_roles?.role_key))
    if (!keys.has('OWNER') && !keys.has('ADMIN') && !keys.has('MODERATOR')) {
      throw new ForbiddenError('Not allowed')
    }
  }

  const { data: tok } = await supabase.from('event_checkin_tokens').select('token_hash').eq('registration_id', registrationId).maybeSingle()
  if (!tok) throw new NotFoundError('CheckinToken', registrationId)

  const { data, error } = await supabase.rpc('rpc_event_checkin', {
    p_token_hash: tok.token_hash,
    p_actor_id: actorId,
    p_device_id: 'manual',
  })
  if (error) throw new Error(error.message)

  await writeAudit(supabase, {
    actorId,
    action: 'event.checkin.manual',
    entityType: 'event_attendance',
    entityId: (data as any).attendance_id,
    scopeType: 'event',
    scopeId: eventId,
    requestId,
  })

  return data
}