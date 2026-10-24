// ============================================================
// lib/community/service.events.ts
// Event lifecycle + registration + waitlist + check-in + attendance.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import {
  writeAudit, writeOutbox, createKernelEvent, createNotification,
  NotFoundError, ForbiddenError, ValidationError, StateConflictError,
} from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from './permissions'
import { normalizeSlug } from './slugs'

export type EventStatus =
  | 'DRAFT' | 'SCHEDULED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED'
  | 'LIVE' | 'ENDED' | 'CANCELLED' | 'ARCHIVED'

const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED', 'ARCHIVED'],
  SCHEDULED: ['REGISTRATION_OPEN', 'LIVE', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'LIVE', 'CANCELLED'],
  REGISTRATION_CLOSED: ['LIVE', 'CANCELLED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
}

function assertTransition(from: EventStatus, to: EventStatus) {
  if (from === to) return
  const allowed = ALLOWED_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new StateConflictError(`Cannot transition event from ${from} to ${to}`)
  }
}

// -----------------------------------------------------------
// CREATE / GET / UPDATE / PUBLISH
// -----------------------------------------------------------

export interface CreateEventInput {
  community_id: string
  title: string
  tagline?: string
  description?: string
  event_type?: string
  slug?: string
  starts_at: string
  ends_at?: string
  is_online?: boolean
  location_text?: string
  meeting_url?: string
  timezone?: string
  cover_url?: string
  cover_file_id?: string
  registration?: {
    capacity?: number
    waitlist_enabled?: boolean
    require_approval?: boolean
    members_only?: boolean
    allow_guests?: boolean
    registration_opens_at?: string
    registration_closes_at?: string
  }
}

export async function createEvent(
  supabase: SupabaseClient,
  actorId: string,
  input: CreateEventInput,
  requestId?: string
): Promise<{ event: any; event_id: string }> {
  const canCreate = await hasCommunityPermission(
    supabase, actorId, input.community_id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
  )
  if (!canCreate) throw new ForbiddenError('You cannot create events in this community')

  if (!input.title?.trim()) throw new ValidationError([{ field: 'title', message: 'Title required' }])
  if (!input.starts_at) throw new ValidationError([{ field: 'starts_at', message: 'Start time required' }])
  if (input.ends_at && new Date(input.ends_at) <= new Date(input.starts_at)) {
    throw new ValidationError([{ field: 'ends_at', message: 'End must be after start' }])
  }

  const baseSlug = normalizeSlug(input.slug || input.title)
  let slug = baseSlug
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase
      .from('community_events_v2')
      .select('id')
      .eq('community_id', input.community_id)
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt + 1}`
    if (attempt > 20) { slug = `${baseSlug}-${Date.now().toString(36)}`; break }
  }

  const { data: event, error } = await supabase
    .from('community_events_v2')
    .insert({
      community_id: input.community_id,
      owner_identity_id: actorId,
      slug,
      title: input.title.trim(),
      tagline: input.tagline?.trim() || null,
      description: input.description?.trim() || null,
      event_type: input.event_type || 'GENERAL',
      is_online: input.is_online !== false,
      location_text: input.location_text || null,
      meeting_url: input.meeting_url || null,
      timezone: input.timezone || 'UTC',
      cover_url: input.cover_url || null,
      cover_file_id: input.cover_file_id || null,
      starts_at: input.starts_at,
      ends_at: input.ends_at || null,
      registration_opens_at: input.registration?.registration_opens_at || null,
      registration_closes_at: input.registration?.registration_closes_at || null,
      status: 'DRAFT',
    })
    .select('*')
    .single()
  if (error || !event) throw new Error(`Event creation failed: ${error?.message}`)

  await supabase.from('community_event_registration_config').insert({
    event_id: event.id,
    registration_mode: input.registration?.require_approval ? 'APPROVAL_REQUIRED' : 'OPEN',
    capacity: input.registration?.capacity || null,
    waitlist_enabled: input.registration?.waitlist_enabled !== false,
    require_approval: !!input.registration?.require_approval,
    members_only: !!input.registration?.members_only,
    allow_guests: !!input.registration?.allow_guests,
  })

  await writeAudit(supabase, {
    actorId,
    action: 'community.event.created',
    entityType: 'community_event',
    entityId: event.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
  })

  const evt = createKernelEvent({
    eventType: 'community.event.created',
    aggregateType: 'community_event',
    aggregateId: event.id,
    actorId,
    payload: { community_id: input.community_id, event_id: event.id, slug },
  })
  const eventId = await writeOutbox(supabase, evt)

  return { event, event_id: eventId }
}

export async function updateEvent(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  patch: Partial<CreateEventInput>,
  requestId?: string
) {
  const { data: event } = await supabase.from('community_events_v2').select('*').eq('id', eventId).maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  const canEdit = event.owner_identity_id === actorId
    || await hasCommunityPermission(supabase, actorId, event.community_id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE)
  if (!canEdit) throw new ForbiddenError('Cannot edit this event')

  const update: any = {}
  if (patch.title) update.title = patch.title.trim()
  if (patch.tagline !== undefined) update.tagline = patch.tagline?.trim() || null
  if (patch.description !== undefined) update.description = patch.description?.trim() || null
  if (patch.event_type) update.event_type = patch.event_type
  if (patch.starts_at) update.starts_at = patch.starts_at
  if (patch.ends_at !== undefined) update.ends_at = patch.ends_at || null
  if (patch.is_online !== undefined) update.is_online = patch.is_online
  if (patch.location_text !== undefined) update.location_text = patch.location_text || null
  if (patch.meeting_url !== undefined) update.meeting_url = patch.meeting_url || null
  if (patch.timezone) update.timezone = patch.timezone
  if (patch.cover_url !== undefined) update.cover_url = patch.cover_url || null
  if (patch.cover_file_id !== undefined) update.cover_file_id = patch.cover_file_id || null
  update.version = (event.version || 1) + 1

  const { data: updated } = await supabase.from('community_events_v2').update(update).eq('id', eventId).select('*').single()

  if (patch.registration) {
    const configPatch: any = {}
    if (patch.registration.capacity !== undefined) configPatch.capacity = patch.registration.capacity
    if (patch.registration.waitlist_enabled !== undefined) configPatch.waitlist_enabled = patch.registration.waitlist_enabled
    if (patch.registration.require_approval !== undefined) configPatch.require_approval = patch.registration.require_approval
    if (patch.registration.members_only !== undefined) configPatch.members_only = patch.registration.members_only
    if (patch.registration.allow_guests !== undefined) configPatch.allow_guests = patch.registration.allow_guests
    if (Object.keys(configPatch).length > 0) {
      await supabase.from('community_event_registration_config').update(configPatch).eq('event_id', eventId)
    }
  }

  await writeAudit(supabase, {
    actorId,
    action: 'community.event.updated',
    entityType: 'community_event',
    entityId: eventId,
    requestId,
    metadata: { changes: Object.keys(update) },
  })

  return updated
}

export async function transitionEventStatus(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  toStatus: EventStatus,
  reason?: string,
  requestId?: string
) {
  const { data: event } = await supabase.from('community_events_v2').select('*').eq('id', eventId).maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  const canManage = event.owner_identity_id === actorId
    || await hasCommunityPermission(supabase, actorId, event.community_id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE)
  if (!canManage) throw new ForbiddenError('Cannot manage this event')

  assertTransition(event.status as EventStatus, toStatus)

  const patch: any = { status: toStatus }
  if (toStatus === 'SCHEDULED' || toStatus === 'REGISTRATION_OPEN') {
    if (!event.published_at) patch.published_at = new Date().toISOString()
  }
  if (toStatus === 'CANCELLED') {
    patch.cancelled_at = new Date().toISOString()
    patch.cancellation_reason = reason || null
  }

  await supabase.from('community_events_v2').update(patch).eq('id', eventId)

  await writeAudit(supabase, {
    actorId,
    action: `community.event.${toStatus.toLowerCase()}`,
    entityType: 'community_event',
    entityId: eventId,
    requestId,
    before: { status: event.status },
    after: { status: toStatus },
  })

  const outboxEvt = createKernelEvent({
    eventType: toStatus === 'CANCELLED' ? 'community.event.cancelled' : 'community.event.status_changed',
    aggregateType: 'community_event',
    aggregateId: eventId,
    actorId,
    payload: {
      community_id: event.community_id,
      event_id: eventId,
      from: event.status,
      to: toStatus,
      reason,
    },
  })
  const outboxEventId = await writeOutbox(supabase, outboxEvt)

  // If cancelled, notify all confirmed registrants
  if (toStatus === 'CANCELLED') {
    const { data: regs } = await supabase
      .from('community_event_registrations')
      .select('identity_id, id')
      .eq('event_id', eventId)
      .in('status', ['CONFIRMED', 'WAITLISTED'])
    for (const r of (regs || []) as any[]) {
      if (r.identity_id === actorId) continue
      await createNotification(supabase, {
        recipientId: r.identity_id,
        type: 'community_event_cancelled',
        priority: 'HIGH',
        entityType: 'community_event',
        entityId: eventId,
        title: `Event cancelled: ${event.title}`,
        body: reason || 'This event has been cancelled by the organizer.',
        actionUrl: `/community/${event.community_id}/events/${event.slug}`,
        icon: 'alert',
      })
    }
    // Mark all pending registrations cancelled
    await supabase
      .from('community_event_registrations')
      .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString(), cancellation_reason: 'Event cancelled' })
      .eq('event_id', eventId)
      .in('status', ['CONFIRMED', 'WAITLISTED', 'PENDING'])
  }

  return { status: toStatus, event_id: outboxEventId }
}

// -----------------------------------------------------------
// REGISTRATION
// -----------------------------------------------------------

function genCheckinToken(): { raw: string; hash: string; preview: string } {
  const raw = randomBytes(24).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash, preview: raw.slice(0, 8) }
}

export async function registerForEvent(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  opts?: { form_submission_id?: string; guests?: number },
  requestId?: string
): Promise<{ registration_id: string; status: string; already_registered?: boolean; registration_number?: string; waitlist_position?: number; qr_url?: string; event_id: string }> {
  const { data: event } = await supabase
    .from('community_events_v2')
    .select('id, community_id, slug, title, ends_at, status')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  // Config members_only check
  const { data: config } = await supabase
    .from('community_event_registration_config')
    .select('members_only, require_approval')
    .eq('event_id', eventId)
    .maybeSingle()
  if (config?.members_only) {
    const { data: mem } = await supabase
      .from('community_memberships')
      .select('status')
      .eq('community_id', event.community_id)
      .eq('identity_id', actorId)
      .maybeSingle()
    if (!mem || mem.status !== 'ACTIVE') {
      throw new ForbiddenError('This event is members-only')
    }
  }

  const { data, error } = await supabase.rpc('rpc_event_register', {
    p_event_id: eventId,
    p_identity_id: actorId,
    p_form_submission_id: opts?.form_submission_id || null,
    p_guests: opts?.guests || 0,
  })
  if (error) throw new Error(error.message)
  const result = data as any
  const status = result.status

  // Generate check-in token for confirmed registrations
  let qrUrl: string | undefined
  if (status === 'CONFIRMED') {
    const { raw, hash, preview } = genCheckinToken()
    const expiresAt = event.ends_at
      ? new Date(new Date(event.ends_at).getTime() + 6 * 60 * 60 * 1000).toISOString()
      : null
    await supabase.from('community_event_checkin_tokens').insert({
      event_id: eventId,
      registration_id: result.registration_id,
      token_hash: hash,
      token_preview: preview,
      expires_at: expiresAt,
    })
    qrUrl = `/checkin/${raw}`
  }

  await writeAudit(supabase, {
    actorId,
    action: `community.event.${status.toLowerCase()}`,
    entityType: 'community_event_registration',
    entityId: result.registration_id,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
    metadata: { event_id: eventId, status },
  })

  const outboxEvt = createKernelEvent({
    eventType: status === 'CONFIRMED' ? 'community.event.registration.confirmed' : 'community.event.registration.waitlisted',
    aggregateType: 'community_event_registration',
    aggregateId: result.registration_id,
    actorId,
    payload: {
      community_id: event.community_id,
      event_id: eventId,
      event_slug: event.slug,
      event_title: event.title,
      registration_id: result.registration_id,
      status,
    },
  })
  const outboxEventId = await writeOutbox(supabase, outboxEvt)

  // Self-notification
  await createNotification(supabase, {
    recipientId: actorId,
    type: status === 'CONFIRMED' ? 'community_event_registration_confirmed' : 'community_event_registration_waitlisted',
    priority: 'NORMAL',
    entityType: 'community_event',
    entityId: eventId,
    title: status === 'CONFIRMED'
      ? `You're in — ${event.title}`
      : `You're on the waitlist — ${event.title}`,
    body: status === 'CONFIRMED'
      ? 'Registration confirmed. Your check-in QR is ready.'
      : 'You will be notified if a spot opens.',
    actionUrl: `/community/${event.community_id}/events/${event.slug}`,
    icon: 'check',
  })

  return {
    registration_id: result.registration_id,
    status,
    already_registered: !!result.already_registered,
    registration_number: result.registration_number,
    waitlist_position: result.waitlist_position,
    qr_url: qrUrl,
    event_id: outboxEventId,
  }
}

export async function cancelRegistration(
  supabase: SupabaseClient,
  actorId: string,
  registrationId: string,
  reason?: string,
  requestId?: string
) {
  const { data: reg } = await supabase
    .from('community_event_registrations')
    .select('*, community_events_v2(slug, title, community_id)')
    .eq('id', registrationId)
    .maybeSingle()
  if (!reg) throw new NotFoundError('Registration', registrationId)

  const isOwn = reg.identity_id === actorId
  const canManage = !isOwn && await hasCommunityPermission(
    supabase, actorId, reg.community_id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
  )
  if (!isOwn && !canManage) throw new ForbiddenError('Cannot cancel this registration')

  const { data, error } = await supabase.rpc('rpc_event_cancel_registration', {
    p_registration_id: registrationId,
    p_actor_id: actorId,
    p_reason: reason || null,
  })
  if (error) throw new Error(error.message)
  const result = data as any

  await writeAudit(supabase, {
    actorId,
    action: 'community.event.registration.cancelled',
    entityType: 'community_event_registration',
    entityId: registrationId,
    scopeType: 'community',
    scopeId: reg.community_id,
    requestId,
    metadata: { reason },
  })

  // If someone was auto-offered a spot, promote them and notify
  if (result?.promoted_registration_id) {
    await promoteAndNotify(supabase, result.promoted_registration_id)
  }

  return { cancelled: true, promoted: !!result?.promoted_registration_id }
}

async function promoteAndNotify(supabase: SupabaseClient, registrationId: string) {
  const { data, error } = await supabase.rpc('rpc_event_promote_waitlist', { p_registration_id: registrationId })
  if (error) return
  const { data: reg } = await supabase
    .from('community_event_registrations')
    .select('identity_id, event_id, community_events_v2(slug, title, community_id)')
    .eq('id', registrationId)
    .maybeSingle()
  if (!reg) return

  // Generate check-in token now that they're confirmed
  const { raw, hash, preview } = genCheckinToken()
  await supabase.from('community_event_checkin_tokens').insert({
    event_id: reg.event_id,
    registration_id: registrationId,
    token_hash: hash,
    token_preview: preview,
  })

  const evt = (reg as any).community_events_v2
  await createNotification(supabase, {
    recipientId: reg.identity_id,
    type: 'community_event_promoted',
    priority: 'HIGH',
    entityType: 'community_event',
    entityId: reg.event_id,
    title: `You're off the waitlist — ${evt?.title}`,
    body: 'A spot opened up. Your registration is now confirmed.',
    actionUrl: evt?.slug ? `/community/${evt.community_id}/events/${evt.slug}` : null,
    icon: 'check',
  })
}

// -----------------------------------------------------------
// CHECK-IN
// -----------------------------------------------------------

export async function checkinByToken(
  supabase: SupabaseClient,
  actorId: string | null,
  rawToken: string,
  opts?: { device_id?: string; method?: 'QR' | 'MANUAL' | 'OFFLINE_SYNC' }
) {
  const hash = createHash('sha256').update(rawToken).digest('hex')

  const { data, error } = await supabase.rpc('rpc_event_checkin', {
    p_token_hash: hash,
    p_recorded_by: actorId,
    p_device_id: opts?.device_id || null,
    p_method: opts?.method || 'QR',
  })
  if (error) throw new StateConflictError(error.message)
  const result = data as any

  if (result?.attendance_id && !result?.already_checked_in) {
    const outboxEvt = createKernelEvent({
      eventType: 'community.event.attendance.recorded',
      aggregateType: 'community_event_attendance',
      aggregateId: result.attendance_id,
      actorId,
      payload: { registration_id: result.registration_id, registration_number: result.registration_number },
    })
    await writeOutbox(supabase, outboxEvt)
  }

  return result
}

export async function manualCheckin(
  supabase: SupabaseClient,
  actorId: string,
  registrationId: string,
  requestId?: string
) {
  const { data: reg } = await supabase
    .from('community_event_registrations')
    .select('*, community_events_v2(community_id)')
    .eq('id', registrationId)
    .maybeSingle()
  if (!reg) throw new NotFoundError('Registration', registrationId)

  const canManage = await hasCommunityPermission(
    supabase, actorId, reg.community_id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
  )
  if (!canManage) throw new ForbiddenError('Only admins can manually check in')

  const { data: token } = await supabase
    .from('community_event_checkin_tokens')
    .select('token_hash')
    .eq('registration_id', registrationId)
    .maybeSingle()

  if (!token) throw new StateConflictError('No check-in token issued for this registration')

  const { data, error } = await supabase.rpc('rpc_event_checkin', {
    p_token_hash: token.token_hash,
    p_recorded_by: actorId,
    p_device_id: null,
    p_method: 'MANUAL',
  })
  if (error) throw new StateConflictError(error.message)

  await writeAudit(supabase, {
    actorId,
    action: 'community.event.attendance.manual_checkin',
    entityType: 'community_event_registration',
    entityId: registrationId,
    scopeType: 'community',
    scopeId: reg.community_id,
    requestId,
  })

  return data
}

// -----------------------------------------------------------
// LIST helpers
// -----------------------------------------------------------

export async function listEventRegistrations(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  status: string = 'ALL',
  cursor: string | null,
  limit: number
) {
  const { data: event } = await supabase
    .from('community_events_v2')
    .select('community_id')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  const canManage = await hasCommunityPermission(
    supabase, actorId, event.community_id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
  )
  if (!canManage) throw new ForbiddenError('Not allowed')

  let query = supabase
    .from('community_event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: true })
    .limit(limit + 1)

  if (status !== 'ALL') query = query.eq('status', status)
  if (cursor) query = query.gt('registered_at', cursor)

  const { data: rows, error } = await query
  if (error) throw error
  const arr = (rows || []) as any[]
  const hasMore = arr.length > limit
  const items = hasMore ? arr.slice(0, limit) : arr
  const nextCursor = hasMore && items[items.length - 1] ? items[items.length - 1].registered_at : null

  const idIds = Array.from(new Set(items.map(i => i.identity_id)))
  const { data: users } = idIds.length > 0
    ? await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', idIds)
    : { data: [] as any[] }
  const map = new Map((users || []).map((u: any) => [u.id, u]))

  // Attach attendance
  const regIds = items.map(i => i.id)
  const { data: attendances } = regIds.length > 0
    ? await supabase.from('community_event_attendance').select('registration_id, checked_in_at, checkin_method').in('registration_id', regIds)
    : { data: [] as any[] }
  const attendanceMap = new Map((attendances || []).map((a: any) => [a.registration_id, a]))

  return {
    items: items.map(r => ({
      ...r,
      user: map.get(r.identity_id) || null,
      attendance: attendanceMap.get(r.id) || null,
    })),
    next_cursor: nextCursor,
    has_more: hasMore,
  }
}