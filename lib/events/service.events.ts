// ============================================================
// lib/events/service.events.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  StateConflictError,
} from '@/lib/kernel'
import {
  hasCommunityPermission,
  COMMUNITY_PERMISSIONS,
} from '@/lib/community/permissions'
import type {
  CreateEventInput,
  EventScheduleInput,
  EventLocationInput,
  RegistrationConfigInput,
  EventStatus,
} from './types'
import { ensureEventSlugAvailable } from './slugs'
import { scheduleDefaultReminders } from './reminders'

// -----------------------------------------------------------
// Local Event State Machine
// (Distinct from community state machine — see lib/community/state-machines.ts)
// -----------------------------------------------------------

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['LIVE', 'CANCELLED', 'ENDED', 'ARCHIVED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
}

function assertTransition(from: EventStatus, to: EventStatus) {
  if (from === to) return
  const allowed = VALID_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new StateConflictError(`Cannot move event from ${from} to ${to}`)
  }
}

// -----------------------------------------------------------
// Authorization
// -----------------------------------------------------------

/**
 * Event admin check.
 * Passes if the actor is:
 *   1. The event's owner_identity_id, OR
 *   2. Has EVENT_MANAGE permission on the parent community, OR
 *   3. Is a system OWNER/ADMIN of the parent community (auto-passes via hasCommunityPermission)
 */
async function requireEventAdmin(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  ownerId: string | null
): Promise<void> {
  if (ownerId && actorId === ownerId) return
  const can = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.EVENT_MANAGE
  )
  if (!can) throw new ForbiddenError('You do not have permission to manage this event')
}

// -----------------------------------------------------------
// CREATE / UPDATE (draft)
// -----------------------------------------------------------

export async function createEvent(
  supabase: SupabaseClient,
  actorId: string,
  input: CreateEventInput,
  requestId?: string
) {
  if (!input.title?.trim()) {
    throw new ValidationError([{ field: 'title', message: 'Title required' }])
  }

  // Uses the Phase A permission fix — OWNER/ADMIN auto-pass, and event.create
  // is now a valid registry key.
  const canCreate = await hasCommunityPermission(
    supabase,
    actorId,
    input.community_id,
    COMMUNITY_PERMISSIONS.EVENT_CREATE
  )
  if (!canCreate) {
    throw new ForbiddenError('You do not have permission to create events in this community')
  }

  const slug = await ensureEventSlugAvailable(
    supabase,
    input.community_id,
    input.slug || input.title
  )

  const { data: event, error } = await supabase
    .from('event_events')
    .insert({
      community_id: input.community_id,
      owner_identity_id: actorId,
      slug,
      title: input.title.trim(),
      tagline: input.tagline?.trim() || null,
      description: input.description?.trim() || null,
      event_type: input.event_type || 'general',
      category: input.category || null,
      cover_url: input.cover_url || null,
      cover_file_id: input.cover_file_id || null,
      is_online: input.is_online ?? true,
      visibility: input.visibility || 'COMMUNITY',
      status: 'DRAFT',
    })
    .select('*')
    .single()

  if (error || !event) throw new Error(`Event creation failed: ${error?.message}`)

  // Bootstrap default registration config
  await supabase.from('event_registration_config').insert({
    event_id: event.id,
    registration_mode: 'OPEN',
    allow_waitlist: true,
    waitlist_offer_hours: 12,
  })

  await writeAudit(supabase, {
    actorId,
    action: 'event.created',
    entityType: 'event',
    entityId: event.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
  })

  return { event }
}

export async function updateEventDraft(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  input: Partial<CreateEventInput> & { registration_form_id?: string | null },
  requestId?: string
) {
  const { data: event } = await supabase
    .from('event_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)

  const patch: Record<string, any> = {}
  if (input.title) patch.title = input.title.trim()
  if (input.tagline !== undefined) patch.tagline = input.tagline?.trim() || null
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.event_type) patch.event_type = input.event_type
  if (input.category !== undefined) patch.category = input.category || null
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url || null
  if (input.cover_file_id !== undefined) patch.cover_file_id = input.cover_file_id || null
  if (typeof input.is_online === 'boolean') patch.is_online = input.is_online
  if (input.visibility) patch.visibility = input.visibility
  if (input.registration_form_id !== undefined) {
    patch.registration_form_id = input.registration_form_id || null
  }

  if (input.slug && input.slug !== event.slug) {
    patch.slug = await ensureEventSlugAvailable(
      supabase,
      event.community_id,
      input.slug,
      eventId
    )
  }

  patch.version = (event.version ?? 1) + 1
  await supabase.from('event_events').update(patch).eq('id', eventId)

  await writeAudit(supabase, {
    actorId,
    action: 'event.updated',
    entityType: 'event',
    entityId: eventId,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
    metadata: { keys: Object.keys(patch) },
  })

  return getEvent(supabase, eventId)
}

// -----------------------------------------------------------
// SCHEDULES / LOCATIONS / CONFIG
// -----------------------------------------------------------

export async function setEventSchedule(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  schedules: EventScheduleInput[],
  requestId?: string
) {
  const { data: event } = await supabase
    .from('event_events')
    .select('community_id, owner_identity_id')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)
  await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)

  if (!schedules || schedules.length === 0) {
    throw new ValidationError([{ field: 'schedules', message: 'At least one schedule required' }])
  }
  for (const s of schedules) {
    if (!s.starts_at) {
      throw new ValidationError([{ field: 'starts_at', message: 'starts_at required' }])
    }
    if (s.ends_at && new Date(s.ends_at) <= new Date(s.starts_at)) {
      throw new ValidationError([{ field: 'ends_at', message: 'ends_at must be after starts_at' }])
    }
  }

  await supabase.from('event_schedules').delete().eq('event_id', eventId)
  await supabase.from('event_schedules').insert(
    schedules.map((s, i) => ({
      event_id: eventId,
      starts_at: s.starts_at,
      ends_at: s.ends_at || null,
      timezone: s.timezone || 'UTC',
      label: s.label || null,
      is_primary: s.is_primary ?? i === 0,
      position: i,
    }))
  )

  await writeAudit(supabase, {
    actorId,
    action: 'event.schedule.updated',
    entityType: 'event',
    entityId: eventId,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
  })
}

export async function setEventLocation(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  locations: EventLocationInput[],
  requestId?: string
) {
  const { data: event } = await supabase
    .from('event_events')
    .select('community_id, owner_identity_id')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)
  await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)

  await supabase.from('event_locations').delete().eq('event_id', eventId)
  if (locations.length > 0) {
    await supabase.from('event_locations').insert(
      locations.map((l, i) => ({
        event_id: eventId,
        location_type: l.location_type,
        name: l.name || null,
        address: l.address || null,
        city: l.city || null,
        country: l.country || null,
        meeting_url: l.meeting_url || null,
        is_primary: l.is_primary ?? i === 0,
      }))
    )
  }

  await writeAudit(supabase, {
    actorId,
    action: 'event.location.updated',
    entityType: 'event',
    entityId: eventId,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
  })
}

export async function updateRegistrationConfig(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  patch: RegistrationConfigInput,
  requestId?: string
) {
  const { data: event } = await supabase
    .from('event_events')
    .select('community_id, owner_identity_id, status')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)
  await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)

  const allowed: Record<string, any> = {}
  const keys: (keyof RegistrationConfigInput)[] = [
    'registration_mode',
    'capacity',
    'allow_waitlist',
    'waitlist_offer_hours',
    'registration_opens_at',
    'registration_closes_at',
    'allow_cancellation',
    'cancellation_deadline',
    'show_attendee_list',
    'require_form_submission',
  ]
  for (const k of keys) if (k in patch) allowed[k] = (patch as any)[k]

  await supabase
    .from('event_registration_config')
    .upsert({ event_id: eventId, ...allowed }, { onConflict: 'event_id' })

  await writeAudit(supabase, {
    actorId,
    action: 'event.registration_config.updated',
    entityType: 'event',
    entityId: eventId,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
    metadata: { keys: Object.keys(allowed) },
  })
}

// -----------------------------------------------------------
// PUBLISH / CANCEL
// -----------------------------------------------------------

export async function publishEvent(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  requestId?: string
) {
  const { data: event } = await supabase
    .from('event_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)
  await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)

  assertTransition(event.status, 'PUBLISHED')

  const { data: schedules } = await supabase
    .from('event_schedules')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)
  if (!schedules || schedules.length === 0) {
    throw new ValidationError([{ field: 'schedules', message: 'Add a schedule before publishing' }])
  }

  await supabase
    .from('event_events')
    .update({ status: 'PUBLISHED', published_at: new Date().toISOString() })
    .eq('id', eventId)

  // Best-effort: schedule reminders. Failure here shouldn't rollback publish.
  try {
    await scheduleDefaultReminders(supabase, eventId)
  } catch (e: any) {
    console.warn('[event:reminder_schedule_failed]', e?.message)
  }

  await writeAudit(supabase, {
    actorId,
    action: 'event.published',
    entityType: 'event',
    entityId: eventId,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
  })

  const evt = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.EVENT_PUBLISHED,
    aggregateType: 'event',
    aggregateId: eventId,
    actorId,
    payload: { event_id: eventId, community_id: event.community_id, slug: event.slug },
  })
  const evId = await writeOutbox(supabase, evt)

  return { event_id: eventId, outbox_event_id: evId }
}

/**
 * BATCHED notification fanout.
 * Loads community slug once, chunks recipient inserts into 500-row batches
 * so it works for events with thousands of attendees.
 */
async function fanoutCancellationNotifications(
  supabase: SupabaseClient,
  eventId: string,
  eventTitle: string,
  communitySlug: string | null,
  actorId: string,
  reason: string | null
): Promise<{ notified: number }> {
  const BATCH = 500
  let notified = 0
  let cursor: string | null = null
  const actionUrl = communitySlug ? `/community/${communitySlug}/events` : '/community'
  const body = reason || 'The organizer cancelled this event.'

  while (true) {
    let q = supabase
      .from('event_registrations')
      .select('identity_id, registered_at')
      .eq('event_id', eventId)
      .in('status', ['CONFIRMED', 'WAITLISTED'])
      .order('registered_at', { ascending: true })
      .limit(BATCH)

    if (cursor) q = q.gt('registered_at', cursor)

    const { data: rows } = await q
    if (!rows || rows.length === 0) break

    const notifRows = rows
      .filter((r: any) => r.identity_id && r.identity_id !== actorId)
      .map((r: any) => ({
        recipient_id: r.identity_id,
        user_id: r.identity_id,
        type: 'event_cancelled',
        priority: 'HIGH',
        entity_type: 'event',
        entity_id: eventId,
        title: `${eventTitle} has been cancelled`,
        body,
        message: body,
        action_url: actionUrl,
        icon: 'alert',
        read: false,
        read_at: null,
      }))

    if (notifRows.length > 0) {
      const { error: insErr } = await supabase.from('notifications').insert(notifRows)
      if (insErr) {
        console.warn('[event:cancel_notify_batch_failed]', insErr.message)
      } else {
        notified += notifRows.length
      }
    }

    if (rows.length < BATCH) break
    cursor = rows[rows.length - 1].registered_at
  }

  return { notified }
}

export async function cancelEvent(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  reason: string | undefined,
  requestId?: string
) {
  const { data: event } = await supabase
    .from('event_events')
    .select('*, communities:community_id(slug)')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)
  await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)

  assertTransition(event.status as EventStatus, 'CANCELLED')

  const communitySlug = (event as any).communities?.slug ?? null

  await supabase
    .from('event_events')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || null,
    })
    .eq('id', eventId)

  // Cancel pending reminders
  await supabase
    .from('event_reminders_schedule')
    .update({ status: 'CANCELLED' })
    .eq('event_id', eventId)
    .eq('status', 'PENDING')

  // Batched fanout — safe for thousands of attendees
  await fanoutCancellationNotifications(
    supabase,
    eventId,
    event.title,
    communitySlug,
    actorId,
    reason || null
  )

  await writeAudit(supabase, {
    actorId,
    action: 'event.cancelled',
    entityType: 'event',
    entityId: eventId,
    scopeType: 'community',
    scopeId: event.community_id,
    requestId,
    metadata: { reason },
  })

  const evt = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.EVENT_CANCELLED,
    aggregateType: 'event',
    aggregateId: eventId,
    actorId,
    payload: { event_id: eventId, community_id: event.community_id },
  })
  await writeOutbox(supabase, evt)
}

// -----------------------------------------------------------
// GET
// -----------------------------------------------------------

export async function getEvent(supabase: SupabaseClient, eventId: string) {
  const { data: event } = await supabase
    .from('event_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  const [
    { data: schedules },
    { data: locations },
    { data: config },
    { data: reminders },
  ] = await Promise.all([
    supabase.from('event_schedules').select('*').eq('event_id', eventId).order('position'),
    supabase.from('event_locations').select('*').eq('event_id', eventId),
    supabase.from('event_registration_config').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.from('event_reminders_schedule').select('*').eq('event_id', eventId),
  ])

  return {
    event,
    schedules: schedules || [],
    locations: locations || [],
    config: config || null,
    reminders: reminders || [],
  }
}

// -----------------------------------------------------------
// REGISTRATION
// -----------------------------------------------------------

export async function registerForEvent(
  supabase: SupabaseClient,
  actorId: string,
  eventId: string,
  formSubmissionId: string | null,
  requestId?: string
) {
  // Single fetch with everything we need
  const { data: event } = await supabase
    .from('event_events')
    .select('id, community_id, title, slug, status, visibility')
    .eq('id', eventId)
    .maybeSingle()
  if (!event) throw new NotFoundError('Event', eventId)

  // Membership check for non-PUBLIC events
  if (event.visibility !== 'PUBLIC') {
    const { data: mem } = await supabase
      .from('community_memberships')
      .select('id, status')
      .eq('community_id', event.community_id)
      .eq('identity_id', actorId)
      .maybeSingle()
    if (!mem || mem.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active community member to register')
    }
  }

  const { data, error } = await supabase.rpc('rpc_event_register', {
    p_event_id: eventId,
    p_identity_id: actorId,
    p_form_submission_id: formSubmissionId,
  })
  if (error) throw new Error(error.message)

  const result = data as any
  const registrationId = result.registration_id
  const status = result.status

  // Issue check-in token only for newly-confirmed registrations
  let rawToken: string | null = null
  if (status === 'CONFIRMED' && !result.already_registered) {
    rawToken = generateCheckinToken()
    const tokenHash = hashToken(rawToken)
    const { error: tokErr } = await supabase.from('event_checkin_tokens').insert({
      event_id: eventId,
      registration_id: registrationId,
      token_hash: tokenHash,
      token_preview: rawToken.slice(0, 8),
    })
    if (tokErr) {
      console.warn('[event:checkin_token_insert_failed]', tokErr.message)
      rawToken = null
    }
  }

  // Confirmation notification
  await createNotification(supabase, {
    recipientId: actorId,
    type: status === 'CONFIRMED' ? 'event_registration_confirmed' : 'event_waitlisted',
    priority: 'NORMAL',
    entityType: 'event',
    entityId: eventId,
    title:
      status === 'CONFIRMED'
        ? `You're registered for ${event.title}`
        : `You're on the waitlist for ${event.title}`,
    body:
      status === 'CONFIRMED'
        ? `Registration number ${result.registration_number}`
        : `You'll be notified if a seat opens up.`,
    actionUrl: `/community/${event.community_id}/events/${event.slug}`,
    icon: status === 'CONFIRMED' ? 'check' : 'clock',
  })

  await writeAudit(supabase, {
    actorId,
    action:
      status === 'CONFIRMED'
        ? 'event.registration.confirmed'
        : 'event.registration.waitlisted',
    entityType: 'event_registration',
    entityId: registrationId,
    scopeType: 'event',
    scopeId: eventId,
    requestId,
    metadata: { status },
  })

  const outboxEvent = createKernelEvent({
    eventType:
      status === 'CONFIRMED'
        ? KERNEL_EVENT_TYPES.EVENT_REGISTRATION_CONFIRMED
        : KERNEL_EVENT_TYPES.EVENT_REGISTRATION_WAITLISTED,
    aggregateType: 'event_registration',
    aggregateId: registrationId,
    actorId,
    payload: {
      event_id: eventId,
      registration_id: registrationId,
      status,
      registration_number: result.registration_number,
    },
  })
  const evId = await writeOutbox(supabase, outboxEvent)

  return {
    registration_id: registrationId,
    status,
    registration_number: result.registration_number,
    waitlist_position: result.waitlist_position,
    checkin_token: rawToken,
    event_id: evId,
  }
}

export async function cancelRegistration(
  supabase: SupabaseClient,
  actorId: string,
  registrationId: string,
  reason: string | undefined,
  requestId?: string
) {
  const { data: reg } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('id', registrationId)
    .maybeSingle()
  if (!reg) throw new NotFoundError('Registration', registrationId)

  if (reg.identity_id !== actorId) {
    const { data: event } = await supabase
      .from('event_events')
      .select('community_id, owner_identity_id')
      .eq('id', reg.event_id)
      .maybeSingle()
    if (!event) throw new NotFoundError('Event', reg.event_id)
    await requireEventAdmin(supabase, actorId, event.community_id, event.owner_identity_id)
  }

  const { data, error } = await supabase.rpc('rpc_event_cancel_registration', {
    p_registration_id: registrationId,
    p_actor_id: actorId,
    p_reason: reason || null,
  })
  if (error) throw new Error(error.message)
  const result = data as any

  await supabase
    .from('event_checkin_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('registration_id', registrationId)

  if (result.freed_seat) {
    await promoteNextWaitlist(supabase, reg.event_id, actorId, requestId)
  }

  await writeAudit(supabase, {
    actorId,
    action: 'event.registration.cancelled',
    entityType: 'event_registration',
    entityId: registrationId,
    scopeType: 'event',
    scopeId: reg.event_id,
    requestId,
    metadata: { reason },
  })

  const evt = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.EVENT_REGISTRATION_CANCELLED,
    aggregateType: 'event_registration',
    aggregateId: registrationId,
    actorId,
    payload: { event_id: reg.event_id, registration_id: registrationId },
  })
  await writeOutbox(supabase, evt)

  return result
}

// -----------------------------------------------------------
// WAITLIST PROMOTION
// -----------------------------------------------------------

export async function promoteNextWaitlist(
  supabase: SupabaseClient,
  eventId: string,
  actorId: string | null,
  requestId?: string
) {
  const { data, error } = await supabase.rpc('rpc_event_promote_waitlist', {
    p_event_id: eventId,
  })
  if (error) throw new Error(error.message)
  const result = data as any
  if (!result?.promoted) return result

  const { data: event } = await supabase
    .from('event_events')
    .select('id, title, slug, community_id')
    .eq('id', eventId)
    .maybeSingle()

  await createNotification(supabase, {
    recipientId: result.identity_id,
    type: 'event_waitlist_offer',
    priority: 'HIGH',
    entityType: 'event',
    entityId: eventId,
    title: `A seat opened up for ${event?.title || 'this event'}`,
    body: `You have until the offer expires to accept.`,
    actionUrl: event ? `/community/${event.community_id}/events/${event.slug}` : null,
    icon: 'check',
  })

  await writeAudit(supabase, {
    actorId: actorId || null,
    action: 'event.waitlist.offered',
    entityType: 'event_waitlist_entry',
    entityId: result.offer_id,
    scopeType: 'event',
    scopeId: eventId,
    requestId,
  })

  const evt = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.EVENT_WAITLIST_OFFERED,
    aggregateType: 'event_waitlist_entry',
    aggregateId: result.offer_id,
    actorId: actorId || null,
    payload: {
      event_id: eventId,
      identity_id: result.identity_id,
      offer_expires_at: result.offer_expires_at,
    },
  })
  await writeOutbox(supabase, evt)

  return result
}

export async function acceptWaitlistOffer(
  supabase: SupabaseClient,
  actorId: string,
  waitlistId: string,
  requestId?: string
) {
  // Fetch the waitlist entry first — we need event_id upfront (fixes fragile inline fetch)
  const { data: entry } = await supabase
    .from('event_waitlist_entries')
    .select('id, event_id, registration_id, status')
    .eq('id', waitlistId)
    .maybeSingle()
  if (!entry) throw new NotFoundError('WaitlistEntry', waitlistId)

  const { data, error } = await supabase.rpc('rpc_event_accept_offer', {
    p_waitlist_id: waitlistId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(error.message)
  const result = data as any

  // Issue check-in token
  const rawToken = generateCheckinToken()
  const tokenHash = hashToken(rawToken)
  const { error: tokErr } = await supabase
    .from('event_checkin_tokens')
    .upsert(
      {
        event_id: entry.event_id,
        registration_id: result.registration_id,
        token_hash: tokenHash,
        token_preview: rawToken.slice(0, 8),
      },
      { onConflict: 'registration_id' }
    )
  if (tokErr) console.warn('[event:accept_offer_token_failed]', tokErr.message)

  await writeAudit(supabase, {
    actorId,
    action: 'event.waitlist.accepted',
    entityType: 'event_waitlist_entry',
    entityId: waitlistId,
    requestId,
  })

  return { ...result, checkin_token: rawToken }
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function generateCheckinToken(): string {
  return randomBytes(24).toString('base64url')
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}