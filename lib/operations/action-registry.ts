// ============================================================
// lib/operations/action-registry.ts
// Controlled workflow action handlers.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { createNotification, writeAudit } from '@/lib/kernel'

export interface ActionExecutionContext {
  supabase: SupabaseClient
  runId: string
  actorId: string
  subjectIdentityId: string | null
  targetEntityType: string
  targetEntityId: string
  transitionId: string | null
  correlationId?: string
}

export type ActionHandler = (params: Record<string, any>, ctx: ActionExecutionContext) => Promise<void>

const registry = new Map<string, ActionHandler>()

export function registerAction(actionType: string, handler: ActionHandler) {
  registry.set(actionType, handler)
}

export function getAction(actionType: string): ActionHandler | undefined {
  return registry.get(actionType)
}

/**
 * Execute all workflow actions for a given transition.
 * Failures are logged but never rollback the transition (fire-and-log semantics).
 */
export async function executeTransitionActions(
  ctx: ActionExecutionContext,
  transitionId: string
) {
  const { data: actions } = await ctx.supabase
    .from('operations_workflow_actions')
    .select('*')
    .eq('transition_id', transitionId)
    .order('position', { ascending: true })

  for (const a of (actions || []) as any[]) {
    try {
      const handler = getAction(a.action_type)
      if (!handler) {
        console.warn('[workflow_action:no_handler]', a.action_type)
        continue
      }
      await handler(a.params || {}, ctx)
    } catch (e) {
      console.error('[workflow_action:error]', a.action_type, e)
    }
  }
}

// ----- Built-in handlers -----

registerAction('SEND_NOTIFICATION', async (params, ctx) => {
  const recipient = params.recipient_id || ctx.subjectIdentityId
  if (!recipient) return
  await createNotification(ctx.supabase, {
    recipientId: recipient,
    type: params.type || 'workflow_action',
    priority: params.priority || 'NORMAL',
    entityType: ctx.targetEntityType,
    entityId: ctx.targetEntityId,
    title: params.title || 'Update on your submission',
    body: params.body,
    actionUrl: params.action_url,
    fromUserId: ctx.actorId,
    icon: params.icon || 'alert',
  })
})

registerAction('CREATE_AUDIT', async (params, ctx) => {
  await writeAudit(ctx.supabase, {
    actorId: ctx.actorId,
    action: params.action || 'workflow.custom_action',
    entityType: ctx.targetEntityType,
    entityId: ctx.targetEntityId,
    metadata: params,
  })
})

registerAction('ADD_TAG', async (params, ctx) => {
  const tag = params.tag
  if (!tag) return
  const { data: run } = await ctx.supabase
    .from('operations_workflow_runs')
    .select('tags')
    .eq('id', ctx.runId)
    .maybeSingle()
  const tags = Array.from(new Set([...(run?.tags || []), tag]))
  await ctx.supabase.from('operations_workflow_runs').update({ tags }).eq('id', ctx.runId)
})

registerAction('REMOVE_TAG', async (params, ctx) => {
  const tag = params.tag
  if (!tag) return
  const { data: run } = await ctx.supabase
    .from('operations_workflow_runs')
    .select('tags')
    .eq('id', ctx.runId)
    .maybeSingle()
  const tags = (run?.tags || []).filter((t: string) => t !== tag)
  await ctx.supabase.from('operations_workflow_runs').update({ tags }).eq('id', ctx.runId)
})

registerAction('MOVE_BUCKET', async (params, ctx) => {
  const bucketId = params.to_bucket_id
  if (!bucketId) return
  const { data: item } = await ctx.supabase
    .from('operations_bucket_items')
    .select('id')
    .eq('workflow_run_id', ctx.runId)
    .maybeSingle()
  if (!item) return
  await ctx.supabase.rpc('rpc_bucket_move', {
    p_item_id: item.id,
    p_to_bucket_id: bucketId,
    p_actor_id: ctx.actorId,
    p_reason: params.reason || 'Automatic move from workflow transition',
  })
})

registerAction('ASSIGN_REVIEWER', async (params, ctx) => {
  // No-op unless integrated with a reviewer table — safe placeholder
  await writeAudit(ctx.supabase, {
    actorId: ctx.actorId,
    action: 'workflow.reviewer_assigned',
    entityType: 'workflow_run',
    entityId: ctx.runId,
    metadata: params,
  })
})

registerAction('CREATE_TASK', async (params, ctx) => {
  // Task table would live in a task domain — audit for now
  await writeAudit(ctx.supabase, {
    actorId: ctx.actorId,
    action: 'workflow.task_created',
    entityType: 'workflow_run',
    entityId: ctx.runId,
    metadata: params,
  })
})

registerAction('SEND_MAIL', async (params, ctx) => {
  // Actual mail delivery handled by dsrt-mail domain worker (later phase);
  // Here we log intent
  await writeAudit(ctx.supabase, {
    actorId: ctx.actorId,
    action: 'workflow.mail_requested',
    entityType: 'workflow_run',
    entityId: ctx.runId,
    metadata: params,
  })
})

registerAction('SCHEDULE_JOB', async (params, ctx) => {
  await writeAudit(ctx.supabase, {
    actorId: ctx.actorId,
    action: 'workflow.job_scheduled',
    entityType: 'workflow_run',
    entityId: ctx.runId,
    metadata: params,
  })
})