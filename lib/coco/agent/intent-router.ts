// ============================================================
// lib/coco/agent/intent-router.ts
// Route requests to the correct task class.
// ============================================================

import { executeModelRequest } from '@/lib/coco/gateway'
import type { CocoModelRequest, CocoTaskClass } from '@/types/coco'
import { shouldQueryKnowledgeBase } from '@/lib/coco/knowledge/retriever'

export async function classifyIntent(
  userMessage: string,
  userId: string,
  conversationId: string,
  requestId: string
): Promise<CocoTaskClass> {
  // Fast heuristics first (avoids extra LLM call)
  const msg = userMessage.trim().toLowerCase()

  // Deterministic navigation
  if (/^(take me|open|go to|navigate|switch to|show me)/.test(msg)) {
    return 'A_DETERMINISTIC'
  }

  // Factual DSRT questions → retrieval
  if (shouldQueryKnowledgeBase(userMessage)) {
    return 'B_RETRIEVAL'
  }

  // Agentic verbs
  if (/\b(send|draft|compose|invite|apply|publish|create|delete|change|update|find someone)\b/.test(msg)) {
    return 'E_AGENTIC'
  }

  // Reasoning verbs
  if (/\b(should i|recommend|analyze|compare|which is better|help me decide|evaluate)\b/.test(msg)) {
    return 'D_REASONING'
  }

  // Fallback: use FAST model to classify
  const req: CocoModelRequest = {
    tier: 'FAST',
    task_class: 'A_DETERMINISTIC',
    user_id: userId,
    conversation_id: conversationId,
    request_id: requestId,
    temperature: 0.1,
    max_tokens: 20,
    messages: [
      {
        role: 'system',
        content: `Classify the user's request into exactly one of:
- A_DETERMINISTIC (navigate, open, switch)
- B_RETRIEVAL (factual questions about DSRT rules, guidelines, how-to)
- C_GENERATION (chat, rewrite, casual)
- D_REASONING (recommendations, analysis)
- E_AGENTIC (multi-step actions with tools)
Reply with ONLY the exact category string.`,
      },
      { role: 'user', content: userMessage },
    ],
  }

  try {
    const res = await executeModelRequest(req)
    const text = res.content.trim().toUpperCase()
    if (text.includes('A_DETERMINISTIC')) return 'A_DETERMINISTIC'
    if (text.includes('B_RETRIEVAL')) return 'B_RETRIEVAL'
    if (text.includes('D_REASONING')) return 'D_REASONING'
    if (text.includes('E_AGENTIC')) return 'E_AGENTIC'
    return 'C_GENERATION'
  } catch {
    return 'C_GENERATION'
  }
}