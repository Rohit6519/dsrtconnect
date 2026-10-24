// ============================================================
// lib/coco/actions/manager.ts
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type {
  UUID,
  ActionRunId,
  CocoToolCall,
  CocoActionStatus,
  CocoToolResult,
} from '@/types/coco'

interface CreateActionRunParams {
  userId: UUID
  conversationId: UUID
  messageId?: UUID | null
  toolCall: CocoToolCall
  toolVersion: string
  riskLevel: string
  requiresConfirmation: boolean
  summary: string
}

export async function createActionRun(params: CreateActionRunParams): Promise<ActionRunId> {
  const status: CocoActionStatus = params.requiresConfirmation
    ? 'awaiting_confirmation'
    : 'authorized'

  // Only attach proposing_message_id if that message actually exists
  let proposingMessageId: string | null = params.messageId || null
  if (proposingMessageId) {
    const { data: msg } = await adminClient
      .from('coco_messages')
      .select('id')
      .eq('id', proposingMessageId)
      .maybeSingle()
    if (!msg) proposingMessageId = null
  }

  const { data, error } = await adminClient
    .from('coco_action_runs')
    .insert({
      user_id: params.userId,
      conversation_id: params.conversationId,
      proposing_message_id: proposingMessageId,
      tool_name: params.toolCall.tool_name,
      tool_version: params.toolVersion,
      risk_level: params.riskLevel,
      status,
      proposed_call: params.toolCall as any,
      summary: params.summary,
      idempotency_key: params.toolCall.idempotency_key || null,
      expires_at: params.requiresConfirmation
        ? new Date(Date.now() + 5 * 60_000).toISOString()
        : null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create action run: ${error.message}`)
  return data.id
}

export async function authorizeActionRun(actionId: ActionRunId, userId: UUID): Promise<boolean> {
  const { data, error } = await adminClient
    .from('coco_action_runs')
    .update({
      status: 'authorized',
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'awaiting_confirmation')
    .select('id')
    .maybeSingle()

  if (error) console.error('[COCO Actions] Auth error:', error)
  return !!data
}

export async function startActionRun(actionId: ActionRunId): Promise<void> {
  await adminClient
    .from('coco_action_runs')
    .update({
      status: 'executing',
      started_at: new Date().toISOString(),
    })
    .eq('id', actionId)
    .in('status', ['authorized'])
}

export async function resolveActionRun(
  actionId: ActionRunId,
  result: CocoToolResult
): Promise<void> {
  const status: CocoActionStatus = result.success ? 'completed' : 'failed'

  await adminClient
    .from('coco_action_runs')
    .update({
      status,
      result: result as any,
      error: result.error as any,
      completed_at: new Date().toISOString(),
      verification:
        result.verified !== undefined ? { passed: result.verified } : null,
    })
    .eq('id', actionId)
}

export async function cancelActionRun(actionId: ActionRunId, userId: UUID): Promise<void> {
  await adminClient
    .from('coco_action_runs')
    .update({ status: 'cancelled' })
    .eq('id', actionId)
    .eq('user_id', userId)
    .eq('status', 'awaiting_confirmation')
}