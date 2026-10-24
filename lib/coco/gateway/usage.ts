// ============================================================
// lib/coco/gateway/usage.ts
// Asynchronous usage recording for observability.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { CocoModelTier } from '@/types/coco'

export interface RecordUsageParams {
  userId: string
  conversationId?: string
  messageId?: string
  requestId: string
  provider: string
  modelId: string
  tier: CocoModelTier
  inputTokens: number
  outputTokens: number
  totalTokens: number
  latencyMs: number
}

export async function recordModelUsage(params: RecordUsageParams) {
  // Fire and forget — don't block the critical path
  Promise.resolve().then(async () => {
    try {
      await adminClient.from('coco_usage').insert({
        user_id: params.userId,
        conversation_id: params.conversationId || null,
        message_id: params.messageId || null,
        request_id: params.requestId,
        provider: params.provider,
        model_id: params.modelId,
        tier: params.tier,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        total_tokens: params.totalTokens,
        latency_ms: params.latencyMs,
      })
    } catch (err) {
      console.error('[COCO Gateway] Failed to record usage:', err)
    }
  })
}