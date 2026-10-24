import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthContext,
  createKernelEvent,
  writeOutbox,
  writeAudit,
  createNotification,
  ok,
  fail,
} from '@/lib/kernel'

export const dynamic = 'force-dynamic'

/**
 * End-To-End Kernel Smoke Test Route.
 * Verifies Auth Context -> Audit Log -> Outbox -> Notification -> Realtime in one call.
 */
export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    // 1. Audit Log
    await writeAudit(supabase, {
      actorId: ctx.identityId,
      action: 'kernel.smoke_test.executed',
      entityType: 'kernel_test',
      entityId: ctx.requestId,
      requestId: ctx.requestId,
      metadata: { test: true },
    })

    // 2. Notification
    const notifId = await createNotification(supabase, {
      recipientId: ctx.identityId,
      type: 'system_alert',
      priority: 'HIGH',
      title: '🚀 Kernel Smoke Test Successful',
      body: 'Kernel Pipeline (Auth -> Audit -> Outbox -> Notification -> Realtime) is operating cleanly.',
      actionUrl: '/notifications',
    })

    // 3. Outbox Event
    const event = createKernelEvent({
      eventType: 'kernel.smoke_test.completed',
      aggregateType: 'kernel_test',
      aggregateId: ctx.requestId,
      actorId: ctx.identityId,
      payload: { notification_id: notifId },
    })

    const eventId = await writeOutbox(supabase, event)

    return ok(
      {
        message: 'Kernel Smoke Test Executed Successfully',
        notification_id: notifId,
        outbox_event_id: eventId,
        request_id: ctx.requestId,
      },
      { ctx, eventId }
    )
  } catch (err) {
    return fail(err, ctx)
  }
}