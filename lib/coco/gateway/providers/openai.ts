// ============================================================
// lib/coco/gateway/providers/openai.ts
// Lazy OpenAI client — safe when OPENAI_API_KEY is missing.
// ============================================================

import OpenAI from 'openai'
import type { CocoModelRequest, CocoModelResponse, CocoModelStreamChunk } from '@/types/coco'

let _client: OpenAI | null = null

/** True when OPENAI_API_KEY is set and non-empty. */
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY
  return Boolean(key && key.trim().length > 0)
}

function getOpenAIClient(): OpenAI {
  if (_client) return _client

  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  return _client
}

function buildBaseParams(req: CocoModelRequest, modelId: string) {
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
    response_format: req.response_schema
      ? {
          type: 'json_schema' as const,
          json_schema: {
            name: 'response',
            schema: req.response_schema as any,
            strict: true,
          },
        }
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

export async function executeOpenAI(
  req: CocoModelRequest,
  modelId: string
): Promise<CocoModelResponse> {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const openai = getOpenAIClient()
  const startTime = Date.now()

  try {
    const response = await openai.chat.completions.create({
      ...buildBaseParams(req, modelId),
      stream: false,
    })

    const choice = response.choices[0]
    return {
      provider: 'openai',
      model_id: modelId,
      content: choice.message?.content || '',
      tool_calls: choice.message?.tool_calls?.map((tc) => ({
        call_id: tc.id,
        tool_name: tc.function.name,
        arguments: safeJsonParse(tc.function.arguments),
      })),
      finish_reason: choice.finish_reason as any,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
      latency_ms: Date.now() - startTime,
    }
  } catch (err: any) {
    throw err
  }
}

export async function* streamOpenAI(
  req: CocoModelRequest,
  modelId: string
): AsyncGenerator<CocoModelStreamChunk> {
  if (!isOpenAIConfigured()) {
    yield {
      kind: 'error',
      code: 'COCO_MODEL_UNAVAILABLE',
      message: 'OPENAI_API_KEY is not configured',
    }
    return
  }

  try {
    const openai = getOpenAIClient()

    const stream = await openai.chat.completions.create({
      ...buildBaseParams(req, modelId),
      stream: true,
      stream_options: { include_usage: true },
    })

    for await (const chunk of stream) {
      if (chunk.usage) {
        yield {
          kind: 'finish',
          reason: 'stop',
          usage: {
            input_tokens: chunk.usage.prompt_tokens,
            output_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          },
        }
        continue
      }

      const delta = chunk.choices[0]?.delta
      const finish_reason = chunk.choices[0]?.finish_reason

      if (delta?.content) yield { kind: 'text', delta: delta.content }

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
  } catch (err: any) {
    yield {
      kind: 'error',
      code: 'COCO_MODEL_STREAM_FAILED',
      message: err?.message || 'OpenAI stream failed',
    }
  }
}