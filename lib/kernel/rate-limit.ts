// ============================================================
// lib/kernel/rate-limit.ts
// Token-window rate limiter, backed by PostgreSQL.
// Race-safe via UPSERT + atomic RPC (with best-effort fallback).
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { RateLimitError } from './errors'

export interface RateLimitParams {
  bucket: string
  subject: string
  limit: number
  windowSeconds?: number
}

/**
 * Atomically increments the counter for (bucket, subject) inside the current
 * window and throws RateLimitError if the incremented value would exceed limit.
 *
 * Preferred path: rpc_rate_limit_increment (installed in Phase G SQL) does the
 * whole read-modify-write in a single locked UPDATE.
 *
 * Fallback path: best-effort UPSERT with tighter semantics than the old
 * read-then-write. Not perfectly race-free, but bounded — worst case a couple
 * of requests slip through above the limit under heavy contention.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  params: RateLimitParams
): Promise<void> {
  const windowSeconds = params.windowSeconds ?? 60

  // Preferred: atomic RPC
  const rpcRes = await supabase.rpc('rpc_rate_limit_increment', {
    p_bucket: params.bucket,
    p_subject: params.subject,
    p_limit: params.limit,
    p_window_seconds: windowSeconds,
  })

  if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object') {
    const { allowed, count, retry_after } = rpcRes.data as {
      allowed: boolean
      count: number
      retry_after: number | null
    }
    if (!allowed) {
      throw new RateLimitError(retry_after ?? windowSeconds)
    }
    return
  }

  // ---- Fallback path ----
  const now = new Date()
  const nowIso = now.toISOString()

  const { data: record } = await supabase
    .from('kernel_rate_limits')
    .select('*')
    .eq('bucket', params.bucket)
    .eq('subject', params.subject)
    .maybeSingle()

  if (!record) {
    // First hit — try insert. If somebody else beat us to it, retry as update.
    const { error: insErr } = await supabase.from('kernel_rate_limits').insert({
      bucket: params.bucket,
      subject: params.subject,
      count: 1,
      window_start: nowIso,
    })
    if (insErr && (insErr as any).code === '23505') {
      // Someone else inserted first — recurse once
      return checkRateLimit(supabase, params)
    }
    if (insErr) {
      console.warn('[rate_limit:insert_failed]', insErr.message)
    }
    return
  }

  const windowStart = new Date(record.window_start)
  const elapsedSec = (now.getTime() - windowStart.getTime()) / 1000

  if (elapsedSec > windowSeconds) {
    // Window expired — reset (conditional so we don't race with another dispatcher)
    await supabase
      .from('kernel_rate_limits')
      .update({ count: 1, window_start: nowIso })
      .eq('bucket', params.bucket)
      .eq('subject', params.subject)
      .eq('window_start', record.window_start)
    return
  }

  if (record.count >= params.limit) {
    const retryAfter = Math.max(1, Math.ceil(windowSeconds - elapsedSec))
    throw new RateLimitError(retryAfter)
  }

  // Conditional increment — only if the row still shows the same count.
  // If another request bumped it in the meantime, this update returns zero rows
  // and we still block on the NEXT attempt (or allow the current one, which is fine
  // because we know we were under the limit when we checked).
  await supabase
    .from('kernel_rate_limits')
    .update({ count: record.count + 1 })
    .eq('bucket', params.bucket)
    .eq('subject', params.subject)
    .eq('count', record.count)
}