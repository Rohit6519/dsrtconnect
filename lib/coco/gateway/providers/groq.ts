// ============================================================
// lib/coco/gateway/providers/groq.ts
// Production Groq provider — only account-accessible models.
// ============================================================

import Groq from 'groq-sdk'
import type { CocoModelRequest, CocoModelResponse, CocoModelStreamChunk } from '@/types/coco'
import { COCO_GROQ_CASCADE, COCO_GROQ_MODELS } from '../models'

function getApiKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_BACKUP_1,
    process.env.GROQ_API_KEY_BACKUP_2,
  ].filter((k): k is string => Boolean(k && k.trim().length > 0))
}

let keyIndex = 0

function getNextKey(): string {
  const keys = getApiKeys()
  if (keys.length === 0) {
    throw new Error('GROQ_API_KEY is not configured')
  }
  const key = keys[keyIndex % keys.length]
  keyIndex = (keyIndex + 1) % keys.length
  return key
}

function buildParams(req: CocoModelRequest, modelId: string) {
  const tools = req.tools?.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }))

  return {
    model: modelId,
    messages: req.messages as any,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.max_tokens ?? 1024,
    tools: tools?.length ? tools : undefined,
    // gpt-oss on Groq: only set json_object when no tools (some models reject both)
    response_format:
      req.response_schema && !tools?.length
        ? { type: 'json_object' as const }
        : undefined,
  }
}

function safeJsonParse(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str)
  } catch {
    return {}
  }
}

function isModelAccessError(err: any): boolean {
  const msg = String(err?.message || '')
  const code = String(err?.error?.code || err?.code || '')
  return (
    err?.status === 404 ||
    code === 'model_not_found' ||
    msg.includes('model_not_found') ||
    msg.includes('does not exist') ||
    msg.includes('decommissioned') ||
    msg.includes('do not have access')
  )
}

function cascadeForPreferred(preferred?: string): string[] {
  const base = preferred
    ? [preferred, ...COCO_GROQ_CASCADE.filter((m) => m !== preferred)]
    : [...COCO_GROQ_CASCADE]
  // Always end with known-good FAST model
  if (!base.includes(COCO_GROQ_MODELS.FAST)) base.push(COCO_GROQ_MODELS.FAST)
  return base
}

export async function executeGroq(
  req: CocoModelRequest,
  preferredModel?: string
): Promise<CocoModelResponse> {
  const keys = getApiKeys()
  if (keys.length === 0) throw new Error('GROQ_API_KEY is not configured')

  const models = cascadeForPreferred(preferredModel)
  let lastError: Error | null = null
  const startTime = Date.now()

  // Try each key × each model (bounded: max 2 keys × models)
  const keysToTry = keys.slice(0, Math.min(keys.length, 3))

  for (const apiKey of keysToTry) {
    const groq = new Groq({ apiKey })

    for (const modelId of models) {
      try {
        const response = await groq.chat.completions.create({
          ...buildParams(req, modelId),
          stream: false,
        })

        const choice = response.choices[0]
        return {
          provider: 'groq',
          model_id: modelId,
          content: choice?.message?.content || '',
          tool_calls: choice?.message?.tool_calls?.map((tc) => ({
            call_id: tc.id,
            tool_name: tc.function.name,
            arguments: safeJsonParse(tc.function.arguments),
          })),
          finish_reason: (choice?.finish_reason as any) || 'stop',
          usage: {
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
          },
          latency_ms: Date.now() - startTime,
        }
      } catch (err: any) {
        lastError = err
        // Model not available → try next model on same key
        if (isModelAccessError(err)) {
          console.warn(`[Groq] skip model ${modelId}: ${err?.message}`)
          continue
        }
        // Auth/rate limit → try next key
        if (err?.status === 401 || err?.status === 403 || err?.status === 429) {
          console.warn(`[Groq] key/model issue status=${err.status}, rotating`)
          break
        }
        console.warn(`[Groq] ${modelId} failed: ${err?.message}`)
      }
    }
  }

  throw lastError || new Error('All Groq models/keys failed')
}

export async function* streamGroq(
  req: CocoModelRequest,
  preferredModel?: string
): AsyncGenerator<CocoModelStreamChunk> {
  const keys = getApiKeys()
  if (keys.length === 0) {
    yield {
      kind: 'error',
      code: 'COCO_MODEL_UNAVAILABLE',
      message: 'GROQ_API_KEY is not configured',
    }
    return
  }

  const models = cascadeForPreferred(preferredModel)
  const keysToTry = keys.slice(0, Math.min(keys.length, 3))
  let lastError: Error | null = null

  for (const apiKey of keysToTry) {
    const groq = new Groq({ apiKey })

    for (const modelId of models) {
      let started = false
      try {
        const stream = await groq.chat.completions.create({
          ...buildParams(req, modelId),
          stream: true,
        })

        for await (const chunk of stream) {
          started = true
          const delta = chunk.choices[0]?.delta
          const finish_reason = chunk.choices[0]?.finish_reason

          if (delta?.content) {
            yield { kind: 'text', delta: delta.content }
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.function?.name) {
                yield {
                  kind: 'tool_call_delta',
                  call_id: tc.id || '',
                  tool_name: tc.function.name,
                }
              }
              if (tc.function?.arguments) {
                yield {
                  kind: 'tool_call_delta',
                  call_id: tc.id || '',
                  arguments_delta: tc.function.arguments,
                }
              }
            }
          }

          if (finish_reason) {
            yield { kind: 'finish', reason: finish_reason as any }
          }
        }

        if (started) return
      } catch (err: any) {
        lastError = err
        if (started) {
          yield {
            kind: 'error',
            code: 'COCO_STREAM_INTERRUPTED',
            message: 'Stream interrupted. Please try again.',
          }
          return
        }
        if (isModelAccessError(err)) {
          console.warn(`[Groq stream] skip ${modelId}`)
          continue
        }
        if (err?.status === 401 || err?.status === 403 || err?.status === 429) {
          break
        }
      }
    }
  }

  yield {
    kind: 'error',
    code: 'COCO_MODEL_STREAM_FAILED',
    message:
      lastError?.message ||
      'Could not reach Groq with any available model. Check GROQ_API_KEY and model access.',
  }
}

/** Used by health route — pick first working model */
export async function probeGroq(): Promise<{ ok: boolean; model?: string; detail: string }> {
  const keys = getApiKeys()
  if (keys.length === 0) {
    return { ok: false, detail: 'GROQ_API_KEY missing' }
  }

  const groq = new Groq({ apiKey: keys[0] })

  for (const modelId of COCO_GROQ_CASCADE) {
    try {
      const res = await groq.chat.completions.create({
        model: modelId,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      })
      return {
        ok: true,
        model: modelId,
        detail: `OK (${res.choices[0]?.message?.content || 'pong'})`,
      }
    } catch (err: any) {
      continue
    }
  }

  // List what the key can actually see
  try {
    const listed = await groq.models.list()
    const ids = (listed.data || []).map((m: any) => m.id).slice(0, 20)
    return {
      ok: false,
      detail: `No cascade model worked. Account models sample: ${ids.join(', ')}`,
    }
  } catch (err: any) {
    return { ok: false, detail: err?.message || 'Groq probe failed' }
  }
}