// ============================================================
// lib/coco/gateway/index.ts
// Primary Entrypoint for COCO Model Inference.
// See COCO spec §10, §14.
// ============================================================

import type { CocoModelRequest, CocoModelResponse, CocoModelStreamChunk } from '@/types/coco'
import { routeExecution, routeStream } from './router'
import { recordModelUsage } from './usage'

/**
 * Execute a blocking model request.
 * Handles routing, fallbacks, structured outputs, and usage recording.
 */
export async function executeModelRequest(req: CocoModelRequest): Promise<CocoModelResponse> {
  const response = await routeExecution(req)

  // Record usage asynchronously
  recordModelUsage({
    userId: req.user_id,
    conversationId: req.conversation_id,
    requestId: req.request_id,
    provider: response.provider,
    modelId: response.model_id,
    tier: req.tier,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    totalTokens: response.usage.total_tokens,
    latencyMs: response.latency_ms
  })

  return response
}

/**
 * Execute a streaming model request.
 * Yields standard CocoModelStreamChunks. Handles fallbacks gracefully.
 */
export async function* streamModelRequest(req: CocoModelRequest): AsyncGenerator<CocoModelStreamChunk> {
  const startTime = Date.now()
  let inputTokens = 0
  let outputTokens = 0
  
  const stream = routeStream(req)

  for await (const chunk of stream) {
    // Intercept finish chunks to grab usage, but still yield them
    if (chunk.kind === 'finish' && chunk.usage) {
      inputTokens = chunk.usage.input_tokens || 0
      outputTokens = chunk.usage.output_tokens || 0
    }
    yield chunk
  }

  // After stream ends, record usage if we got token counts
  if (inputTokens > 0 || outputTokens > 0) {
    recordModelUsage({
      userId: req.user_id,
      conversationId: req.conversation_id,
      requestId: req.request_id,
      provider: 'unknown', // Stream router hides this, but usage is captured
      modelId: 'stream',
      tier: req.tier,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs: Date.now() - startTime
    })
  }
}