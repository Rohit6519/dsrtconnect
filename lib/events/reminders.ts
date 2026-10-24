// ============================================================
// lib/events/reminders.ts
// Cron-driven maintenance for events: reminders, expiry, no-shows.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_REMINDERS = [
  { key: '24h_before', offset_minutes: -1440, title: 'Tomorrow: {{event_title}}', body: 'Reminder for tomorrow.' },
  { key: '1h_before', offset_minutes: -60, title: 'Starting in 1 hour: {{event_title}}', body: 'The event begins soon.' },
  { key: '15m_before', offset_minutes: -15, title: 'Starting in 15 minutes: {{event_title}}', body: '' },
]

/**
 * System actor UUID for automated cron jobs.
 * Set DSRT_SYSTEM_ACTOR_ID in env to a real users.id that owns automated actions,
 * otherwise falls back to the community owner where possible.
 */
const SYSTEM_ACTOR_ID = process.env.DSRT_SYSTEM_ACTOR_ID || null

export async function scheduleDefaultReminders(supabase: SupabaseClient, eventId: string) {
  const { data: primary } = await supabase
    .from('event_schedules')
    .select('starts_at')
    .eq('event_id', eventId)
    .eq('is_primary', true)
    .maybeSingle()
  if (!primary?.starts_at) return

  const start = new Date(primary.starts_at).getTime()
  const rows = DEFAULT_REMINDERS.map((r) => ({
    event_id: eventId,
    reminder_key: r.key,
    offset_minutes: r.offset_minutes,
    title_template: r.title,
    body_template: r.body,
    channel: 'IN_APP',
    scheduled_for: new Date(start + r.offset_minutes * 60_000).toISOString(),
    status: 'PENDING',
  }))
  for (const row of rows) {
    await supabase
      .from('event_reminders_schedule')
      .upsert(row, { onConflict: 'event_id,reminder_key' })
  }
}

/**
 * Dispatch due reminders in batches. Called by cron.
 * Fanout is batched (500 recipients per insert) so it scales to large events.
 */
export async function dispatchDueReminders(supabase: SupabaseClient): Promise<{ dispatched: number }> {
  const nowIso = new Date().toISOString()
  const { data: due } = await supabase
    .from('event_reminders_schedule')
    .select('*, event_events(id, title, slug, community_id, status)')
    .eq('status', 'PENDING')
    .lte('scheduled_for', nowIso)
    .limit(20)

  if (!due || due.length === 0) return { dispatched: 0 }
  let dispatched = 0

  for (const r of due as any[]) {
    const event = r.event_events
    if (!event || event.status === 'CANCELLED') {
      await supabase
        .from('event_reminders_schedule')
        .update({ status: 'CANCELLED' })
        .eq('id', r.id)
      continue
    }

    const title = (r.title_template || 'Reminder').replace('{{event_title}}', event.title)
    const body = (r.body_template || '').replace('{{event_title}}', event.title)
    const actionUrl = `/community/${event.community_id}/events/${event.slug}`

    // Batched fanout with composite cursor (identity_id) to avoid skipping
    // members that share joined_at with someone else
    const BATCH = 500
    let cursor: string | null = null

    while (true) {
      let q = supabase
        .from('event_registrations')
        .select('identity_id')
        .eq('event_id', r.event_id)
        .eq('status', 'CONFIRMED')
        .order('identity_id', { ascending: true })
        .limit(BATCH)

      if (cursor) q = q.gt('identity_id', cursor)

      const { data: attendees } = await q
      if (!attendees || attendees.length === 0) break

      const rows = attendees.map((a: any) => ({
        recipient_id: a.identity_id,
        user_id: a.identity_id,
        type: 'event_reminder',
        priority: 'NORMAL',
        entity_type: 'event',
        entity_id: r.event_id,
        title,
        body,
        message: body,
        action_url: actionUrl,
        icon: 'clock',
        read: false,
        read_at: null,
      }))
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('notifications').insert(rows)
        if (insErr) {
          console.warn('[reminders:batch_insert_failed]', insErr.message)
        }
      }

      if (attendees.length < BATCH) break
      cursor = attendees[attendees.length - 1].identity_id
    }

    await supabase
      .from('event_reminders_schedule')
      .update({ status: 'DISPATCHED', dispatched_at: nowIso })
      .eq('id', r.id)
    dispatched++
  }

  return { dispatched }
}

/**
 * Expire stale waitlist offers and promote next in line.
 * Uses SYSTEM_ACTOR_ID (or falls back to event owner) as p_actor_id.
 */
export async function processExpiredOffers(
  supabase: SupabaseClient
): Promise<{ expired: number }> {
  const nowIso = new Date().toISOString()
  const { data: expired } = await supabase
    .from('event_waitlist_entries')
    .select('id, event_id, registration_id, event_events(owner_identity_id)')
    .eq('status', 'OFFERED')
    .lt('offer_expires_at', nowIso)
    .limit(50)
  if (!expired || expired.length === 0) return { expired: 0 }

  for (const e of expired as any[]) {
    await supabase
      .from('event_waitlist_entries')
      .update({ status: 'EXPIRED' })
      .eq('id', e.id)

    // Use system actor if configured, otherwise event owner, otherwise skip
    // the RPC entirely if there's no valid actor
    const actorId: string | null =
      SYSTEM_ACTOR_ID || e.event_events?.owner_identity_id || null

    if (actorId) {
      const { error: cancelErr } = await supabase.rpc('rpc_event_cancel_registration', {
        p_registration_id: e.registration_id,
        p_actor_id: actorId,
        p_reason: 'Waitlist offer expired',
      })
      if (cancelErr) {
        console.warn('[reminders:expire_cancel_failed]', cancelErr.message)
      }
    } else {
      // Fallback: direct update without going through cancel RPC
      await supabase
        .from('event_registrations')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Waitlist offer expired',
        })
        .eq('id', e.registration_id)
    }

    await supabase.rpc('rpc_event_promote_waitlist', { p_event_id: e.event_id })
  }
  return { expired: expired.length }
}

/**
 * Mark NO_SHOW after event ends for confirmed attendees who never checked in.
 * Single efficient query — no more O(events × attendees) N+1.
 */
export async function markNoShows(
  supabase: SupabaseClient
): Promise<{ updated: number }> {
  const nowIso = new Date().toISOString()

  // Find ended events that are still marked PUBLISHED/LIVE
  const { data: endedEvents } = await supabase
    .from('event_events')
    .select('id, event_schedules!inner(ends_at, is_primary)')
    .in('status', ['LIVE', 'PUBLISHED'])
    .eq('event_schedules.is_primary', true)
    .lt('event_schedules.ends_at', nowIso)
    .limit(100)

  if (!endedEvents || endedEvents.length === 0) return { updated: 0 }

  let updated = 0
  const eventIds: string[] = []

  for (const e of endedEvents as any[]) {
    eventIds.push(e.id)
    // Move each event to ENDED status
    await supabase.from('event_events').update({ status: 'ENDED' }).eq('id', e.id)
  }

  // Batch-find registrations that never checked in
  const { data: confirmedButAbsent } = await supabase
    .from('event_registrations')
    .select('id')
    .in('event_id', eventIds)
    .eq('status', 'CONFIRMED')
    .not(
      'id',
      'in',
      // subquery isn't directly supported; do it in two steps
      '(SELECT registration_id FROM event_attendance)'
    )
    .limit(2000)

  // The .not('in', '(SELECT ...)') pattern above depends on PostgREST support.
  // Portable fallback: fetch attended IDs, then filter client-side.
  if (!confirmedButAbsent || confirmedButAbsent.length === 0) {
    const { data: allConfirmed } = await supabase
      .from('event_registrations')
      .select('id, event_id')
      .in('event_id', eventIds)
      .eq('status', 'CONFIRMED')
    const { data: attended } = await supabase
      .from('event_attendance')
      .select('registration_id')
      .in('event_id', eventIds)
    const attendedSet = new Set((attended || []).map((a: any) => a.registration_id))
    const absent = (allConfirmed || []).filter((r: any) => !attendedSet.has(r.id))

    if (absent.length > 0) {
      const absentIds = absent.map((r: any) => r.id)
      const { error: updErr } = await supabase
        .from('event_registrations')
        .update({ status: 'NO_SHOW' })
        .in('id', absentIds)
      if (updErr) {
        console.warn('[reminders:no_show_update_failed]', updErr.message)
      } else {
        updated += absentIds.length
      }
    }
  } else {
    // Fast path succeeded
    const absentIds = confirmedButAbsent.map((r: any) => r.id)
    await supabase
      .from('event_registrations')
      .update({ status: 'NO_SHOW' })
      .in('id', absentIds)
    updated += absentIds.length
  }

  return { updated }
}