// ============================================================
// lib/kernel/outbox.ts
// Outbox Service & Asynchronous Dispatcher.
// Concurrency-safe: atomic lock-and-fetch + stale lock reaper.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { KernelEventEnvelope, consumeIdempotent } from './events'

export type EventHandlerFn = (event: KernelEventEnvelope, supabase: SupabaseClient) => Promise<void>

const eventHandlersMap = new Map<string, EventHandlerFn[]>()

const STALE_LOCK_MINUTES = 5
const MAX_ATTEMPTS = 5

/**
 * Register a handler for a specific event_type.
 * Idempotent: registering the same handler twice will duplicate — callers should guard
 * with a module-level `let registered = false` flag (see activity-consumers.ts).
 */
export function registerEventHandler(eventType: string, handler: EventHandlerFn) {
  const existing = eventHandlersMap.get(eventType) || []
  eventHandlersMap.set(eventType, [...existing, handler])
}

export function getRegisteredHandlerCount(eventType: string): number {
  return (eventHandlersMap.get(eventType) || []).length
}

/**
 * Write an event to the outbox table inside a Supabase mutation step.
 * This is the ONLY sanctioned way for domain services to publish events.
 */
export async function writeOutbox<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  event: KernelEventEnvelope<T>
): Promise<string> {
  const { error } = await supabase.from('kernel_outbox_events').insert({
    event_id: event.event_id,
    event_type: event.event_type,
    event_version: event.event_version,
    aggregate_type: event.aggregate_type,
    aggregate_id: event.aggregate_id,
    actor_id: event.actor_id,
    correlation_id: event.correlation_id,
    causation_id: event.causation_id,
    payload: event.payload,
    status: 'PENDING',
    attempt_count: 0,
    created_at: event.occurred_at,
  })

  if (error) {
    // Idempotent write: if the event_id already exists we treat as success
    // (Postgres unique-violation code = 23505)
    if ((error as any).code === '23505') return event.event_id
    console.error('[outbox:write_failed]', error)
    throw new Error(`Failed to write outbox event: ${error.message}`)
  }

  return event.event_id
}

/**
 * Reset any rows stuck in PROCESSING for longer than the stale threshold.
 * Called before every dispatch cycle so dead dispatcher pods don't block progress.
 */
export async function reapStaleLocks(supabase: SupabaseClient): Promise<{ reaped: number }> {
  const cutoff = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000).toISOString()

  const { data, error } = await supabase
    .from('kernel_outbox_events')
    .update({ status: 'PENDING', locked_at: null })
    .eq('status', 'PROCESSING')
    .lt('locked_at', cutoff)
    .select('id')

  if (error) {
    console.warn('[outbox:reap_failed]', error.message)
    return { reaped: 0 }
  }
  return { reaped: (data || []).length }
}

/**
 * Atomically claim a batch of PENDING events (or stale PROCESSING ones).
 *
 * PRIMARY PATH: rpc_outbox_claim_batch (installed in Phase G SQL) does the whole
 * claim in a single UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED)
 * transaction, which is the correct concurrency-safe pattern.
 *
 * FALLBACK PATH: if the RPC isn't there yet, we do a compare-and-swap loop
 * where we UPDATE only rows whose (status, locked_at) haven't changed since
 * we read them. This is still safer than the previous read-then-write bug
 * because two dispatchers can't both flip the same PENDING row: the second
 * UPDATE returns zero rows and moves on.
 */
async function claimBatch(
  supabase: SupabaseClient,
  limit: number
): Promise<Array<Record<string, any>>> {
  const nowIso = new Date().toISOString()

  // Try RPC first
  const rpcRes = await supabase.rpc('rpc_outbox_claim_batch', { p_limit: limit })
  if (!rpcRes.error && Array.isArray(rpcRes.data)) {
    return rpcRes.data as Array<Record<string, any>>
  }

  // Fallback: read candidates, then compare-and-swap
  const { data: candidates } = await supabase
    .from('kernel_outbox_events')
    .select('*')
    .eq('status', 'PENDING')
    .is('locked_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  const claimed: Array<Record<string, any>> = []

  for (const row of candidates || []) {
    const { data: updated, error: upErr } = await supabase
      .from('kernel_outbox_events')
      .update({
        status: 'PROCESSING',
        locked_at: nowIso,
        attempt_count: (row as any).attempt_count + 1,
      })
      .eq('id', (row as any).id)
      .eq('status', 'PENDING')
      .is('locked_at', null)
      .select('*')
      .maybeSingle()

    if (!upErr && updated) {
      claimed.push(updated)
    }
  }

  return claimed
}

/**
 * Dispatcher runner: reap stale, claim batch, run consumers, mark PUBLISHED or FAILED.
 */
export async function dispatchPendingOutboxEvents(
  supabase: SupabaseClient,
  limit = 50
): Promise<{ processedCount: number; failedCount: number; reapedStale: number }> {
  // 1. Reap any zombie PROCESSING rows first
  const { reaped } = await reapStaleLocks(supabase)

  // 2. Claim a batch
  const rows = await claimBatch(supabase, limit)
  if (rows.length === 0) {
    return { processedCount: 0, failedCount: 0, reapedStale: reaped }
  }

  let processedCount = 0
  let failedCount = 0

  for (const row of rows) {
    const envelope: KernelEventEnvelope = {
      event_id: row.event_id,
      event_type: row.event_type,
      event_version: row.event_version,
      aggregate_type: row.aggregate_type,
      aggregate_id: row.aggregate_id,
      actor_id: row.actor_id,
      correlation_id: row.correlation_id,
      causation_id: row.causation_id,
      payload: row.payload,
      occurred_at: row.created_at,
    }

    try {
      const handlers = eventHandlersMap.get(row.event_type) || []

      // Run each handler under an idempotency guard so consumers can safely
      // retry without duplicating side-effects.
      for (let i = 0; i < handlers.length; i++) {
        const handler = handlers[i]
        const consumerName = `handler_${row.event_type}_${i}`
        await consumeIdempotent(supabase, consumerName, row.event_id, async () => {
          await handler(envelope, supabase)
        })
      }

      await supabase
        .from('kernel_outbox_events')
        .update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
          locked_at: null,
          last_error: null,
        })
        .eq('id', row.id)

      processedCount++
    } catch (err: any) {
      failedCount++
      const attempt = row.attempt_count // already incremented in claim step
      const nextStatus = attempt >= MAX_ATTEMPTS ? 'DEAD' : 'PENDING'
      const errMsg = String(err?.message || err || 'unknown').slice(0, 2000)

      await supabase
        .from('kernel_outbox_events')
        .update({
          status: nextStatus,
          locked_at: null,
          last_error: errMsg,
        })
        .eq('id', row.id)

      if (nextStatus === 'DEAD') {
        console.error('[outbox:dead_letter]', row.event_type, row.event_id, errMsg)
      }
    }
  }

  return { processedCount, failedCount, reapedStale: reaped }
}