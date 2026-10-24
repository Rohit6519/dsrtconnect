// ============================================================
// lib/coco/gateway/router.ts
// Production router — Groq (account models) first, OpenAI backup.
// ============================================================

import type {
  CocoModelRequest,
  CocoModelResponse,
  CocoModelStreamChunk,
  CocoModelTier,
} from '@/types/coco'
import { executeGroq, streamGroq } from './providers/groq'
import { executeOpenAI, streamOpenAI, isOpenAIConfigured } from './providers/openai'
import { COCO_GROQ_MODELS, COCO_OPENAI_MODELS } from './models'

function preferredGroqModel(tier: CocoModelTier): string {
  switch (tier) {
    case 'FAST':
      return COCO_GROQ_MODELS.FAST
    case 'REASONING':
      return COCO_GROQ_MODELS.REASONING
    case 'GENERAL':
    default:
      return COCO_GROQ_MODELS.GENERAL
  }
}

function preferredOpenAIModel(tier: CocoModelTier): string {
  switch (tier) {
    case 'FAST':
      return COCO_OPENAI_MODELS.FAST
    case 'REASONING':
      return COCO_OPENAI_MODELS.REASONING
    case 'GENERAL':
    default:
      return COCO_OPENAI_MODELS.GENERAL
  }
}

export async function routeExecution(req: CocoModelRequest): Promise<CocoModelResponse> {
  const groqModel = preferredGroqModel(req.tier)

  try {
    return await executeGroq(req, groqModel)
  } catch (groqErr: any) {
    if (isOpenAIConfigured()) {
      try {
        return await executeOpenAI(req, preferredOpenAIModel(req.tier))
      } catch (openaiErr: any) {
        throw new Error(
          `AI unavailable. Groq: ${groqErr?.message || groqErr} | OpenAI: ${openaiErr?.message || openaiErr}`
        )
      }
    }
    throw groqErr
  }
}

export async function* routeStream(
  req: CocoModelRequest
): AsyncGenerator<CocoModelStreamChunk> {
  const groqModel = preferredGroqModel(req.tier)
  let gotContent = false

  try {
    for await (const chunk of streamGroq(req, groqModel)) {
      if (chunk.kind === 'error' && !gotContent) {
        // soft-fail into OpenAI below
        throw new Error(chunk.message)
      }
      if (chunk.kind === 'text' || chunk.kind === 'tool_call_delta') gotContent = true
      yield chunk
    }
    if (gotContent) return
  } catch (err: any) {
    console.warn('[COCO Router] Groq stream failed:', err?.message)
  }

  if (isOpenAIConfigured()) {
    try {
      for await (const chunk of streamOpenAI(req, preferredOpenAIModel(req.tier))) {
        yield chunk
      }
      return
    } catch (err: any) {
      yield {
        kind: 'error',
        code: 'COCO_ALL_PROVIDERS_EXHAUSTED',
        message: err?.message || 'OpenAI fallback failed',
      }
      return
    }
  }

  yield {
    kind: 'error',
    code: 'COCO_ALL_PROVIDERS_EXHAUSTED',
    message:
      'Could not complete AI request. Verify GROQ_API_KEY access to openai/gpt-oss-20b.',
  }
}