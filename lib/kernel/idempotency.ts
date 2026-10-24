// ============================================================
// lib/kernel/idempotency.ts
// Replay protection for critical POST operations.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export async function withIdempotency<T>(
  supabase: SupabaseClient,
  key: string | null | undefined,
  identityId: string,
  endpoint: string,
  requestPayload: Record<string, unknown>,
  handler: () => Promise<{ status: number; body: T }>
): Promise<{ status: number; body: T; cached: boolean }> {
  if (!key) {
    const res = await handler()
    return { ...res, cached: false }
  }

  const hash = createHash('sha256').update(JSON.stringify(requestPayload)).digest('hex')

  // Check if key exists
  const { data: existing } = await supabase
    .from('kernel_idempotency_keys')
    .select('*')
    .eq('key', key)
    .maybeSingle()

  if (existing) {
    if (existing.request_hash !== hash) {
      throw new Error('Idempotency Key Conflict: payload does not match original request')
    }
    return {
      status: existing.response_status ?? 200,
      body: existing.response_body as T,
      cached: true,
    }
  }

  // Execute handler
  const result = await handler()

  // Store idempotency key
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
  await supabase.from('kernel_idempotency_keys').insert({
    key,
    identity_id: identityId,
    endpoint,
    request_hash: hash,
    response_status: result.status,
    response_body: result.body as any,
    expires_at: expiresAt,
  })

  return { ...result, cached: false }
}