// ============================================================
// lib/kernel/pipeline.ts
// Universal Command Pipeline for DSRT Domain Services.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, RequestContext } from './context'
import { checkPermission } from './authz'
import { checkRateLimit } from './rate-limit'
import { withIdempotency } from './idempotency'
import { ok, fail } from './response'
import { ForbiddenError } from './errors'

export interface CommandPipelineOptions<TReq, TRes> {
  action?: string
  rateLimit?: { bucket: string; limit: number; windowSeconds?: number }
  communityIdExtractor?: (reqPayload: TReq) => string | undefined
  resourceOwnerExtractor?: (reqPayload: TReq) => string | undefined
  handler: (args: {
    payload: TReq
    ctx: RequestContext
    supabase: any
  }) => Promise<{ status?: number; data: TRes; eventId?: string }>
}

export function createCommandEndpoint<TReq = Record<string, unknown>, TRes = unknown>(
  options: CommandPipelineOptions<TReq, TRes>
) {
  return async (req: NextRequest) => {
    let ctx: RequestContext | undefined
    try {
      const supabase = await createClient()
      ctx = await requireAuthContext(req)

      let body: TReq = {} as TReq
      if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
        body = await req.json().catch(() => ({} as TReq))
      }

      // 1. Rate Limit
      if (options.rateLimit) {
        await checkRateLimit(supabase, {
          bucket: options.rateLimit.bucket,
          subject: ctx.identityId!,
          limit: options.rateLimit.limit,
          windowSeconds: options.rateLimit.windowSeconds,
        })
      }

      // 2. Permission Check
      if (options.action) {
        const communityId = options.communityIdExtractor?.(body)
        const resourceOwnerId = options.resourceOwnerExtractor?.(body)
        const authz = await checkPermission(supabase, {
          actorId: ctx.identityId!,
          action: options.action,
          communityId,
          resourceOwnerId,
        })

        if (!authz.allow) {
          throw new ForbiddenError(authz.reason)
        }
      }

      // 3. Idempotency Check & Execution
      const idempotencyKey = req.headers.get('idempotency-key')

      const result = await withIdempotency(
        supabase,
        idempotencyKey,
        ctx.identityId!,
        req.nextUrl.pathname,
        body as any,
        async () => {
          const res = await options.handler({ payload: body, ctx: ctx!, supabase })
          return {
            status: res.status ?? 200,
            body: { data: res.data, eventId: res.eventId },
          }
        }
      )

      return ok(result.body.data, {
        ctx,
        eventId: result.body.eventId,
        status: result.status,
      })
    } catch (err) {
      return fail(err, ctx)
    }
  }
}