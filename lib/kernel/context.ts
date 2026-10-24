// ============================================================
// lib/kernel/context.ts
// RequestContext is created by the API layer for every request
// and passed down through domain services.
// ============================================================

import { createHash, randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UnauthenticatedError } from './errors'

export interface RequestContext {
  requestId: string
  traceId: string
  identityId: string | null
  sessionId: string | null
  ipHash: string | null
  userAgent: string | null
  timestamp: string
}

export interface AuthedRequestContext extends RequestContext {
  identityId: string
}

/**
 * Robust random-ID generator that works on every runtime we support.
 * Order of preference:
 *   1. crypto.randomUUID()      (Node 19+, modern browsers, edge runtime)
 *   2. crypto.randomBytes()     (Node ≥14)
 *   3. Math.random-based        (last resort, dev-only shape)
 */
export function safeRandomId(): string {
  try {
    const g: any = globalThis as any
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID()
  } catch {
    /* fall through */
  }
  try {
    const buf = randomBytes(16)
    // RFC 4122 v4 shape
    buf[6] = (buf[6] & 0x0f) | 0x40
    buf[8] = (buf[8] & 0x3f) | 0x80
    const hex = buf.toString('hex')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  } catch {
    /* fall through */
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Generate a stable, non-reversible hash of an IP for audit logs.
 * Never store raw IPs in DSRT audit records.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.DSRT_IP_HASH_SALT || 'dsrt-default-salt'
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 24)
}

/**
 * Extract client IP from headers.
 * Prefers X-Forwarded-For's leftmost entry, falls back to X-Real-IP.
 */
function extractIp(req: NextRequest | Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    return first || null
  }
  return req.headers.get('x-real-ip') || null
}

/**
 * Build a RequestContext for an incoming API request.
 * Returns null identityId if the request is unauthenticated.
 */
export async function buildRequestContext(
  req: NextRequest | Request
): Promise<RequestContext> {
  const requestId = req.headers.get('x-request-id') || safeRandomId()
  const traceId = req.headers.get('x-trace-id') || requestId
  const userAgent = req.headers.get('user-agent') || null
  const ipHash = hashIp(extractIp(req))

  let identityId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    identityId = user?.id ?? null
  } catch (e) {
    // If Supabase can't resolve the user (bad cookie, expired token), treat as anon.
    console.warn('[context:auth_lookup_failed]', (e as any)?.message ?? e)
  }

  return {
    requestId,
    traceId,
    identityId,
    sessionId: null, // populated by session tracker later
    ipHash,
    userAgent,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Same as buildRequestContext but throws if unauthenticated.
 * Use at the top of every protected API route.
 */
export async function requireAuthContext(
  req: NextRequest | Request
): Promise<AuthedRequestContext> {
  const ctx = await buildRequestContext(req)
  if (!ctx.identityId) {
    throw new UnauthenticatedError()
  }
  return ctx as AuthedRequestContext
}