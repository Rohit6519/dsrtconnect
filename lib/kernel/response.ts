// ============================================================
// lib/kernel/response.ts
// Standard API envelope: { data, meta } or { error }.
// ============================================================

import { NextResponse } from 'next/server'
import { KernelError, toKernelError } from './errors'
import type { RequestContext } from './context'

export interface SuccessEnvelope<T> {
  data: T
  meta?: {
    request_id?: string
    event_id?: string
    [k: string]: unknown
  }
}

export function ok<T>(
  data: T,
  opts?: { ctx?: RequestContext; eventId?: string; status?: number; meta?: Record<string, unknown> }
): NextResponse<SuccessEnvelope<T>> {
  const body: SuccessEnvelope<T> = {
    data,
    meta: {
      request_id: opts?.ctx?.requestId,
      event_id: opts?.eventId,
      ...opts?.meta,
    },
  }
  return NextResponse.json(body, { status: opts?.status ?? 200 })
}

export function fail(err: unknown, ctx?: RequestContext): NextResponse {
  const kerr = toKernelError(err, ctx?.requestId)
  // Server-side observability hook
  if (kerr.httpStatus >= 500) {
    console.error('[kernel:error]', {
      code: kerr.code,
      message: kerr.message,
      request_id: kerr.requestId,
      stack: kerr.stack,
    })
  }
  return NextResponse.json(kerr.toEnvelope(), { status: kerr.httpStatus })
}

/**
 * Route handler wrapper — ensures every API route returns the standard envelope.
 * Usage:
 *   export const GET = handler(async ({ ctx, req }) => {
 *     return ok({ hello: 'world' }, { ctx })
 *   })
 */
type HandlerFn<T> = (args: {
  req: Request
  ctx: RequestContext
}) => Promise<NextResponse<SuccessEnvelope<T>> | NextResponse>

export function handler<T = unknown>(fn: HandlerFn<T>) {
  return async (req: Request) => {
    let ctx: RequestContext | undefined
    try {
      const { buildRequestContext } = await import('./context')
      ctx = await buildRequestContext(req as any)
      return await fn({ req, ctx })
    } catch (err) {
      return fail(err, ctx)
    }
  }
}