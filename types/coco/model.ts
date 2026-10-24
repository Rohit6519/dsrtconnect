// ============================================================
// types/coco/model.ts
// Model Gateway contracts.
// The application NEVER references provider SDKs directly.
// See COCO spec §14, §15, §16.
// ============================================================

/**
 * Logical model tiers. Providers/model IDs are mapped inside the gateway.
 * See COCO spec §15.
 */
export type CocoModelTier =
  | 'FAST'          // classification, tool arg extraction, quick answers
  | 'GENERAL'       // rewrites, summaries, standard responses
  | 'REASONING'     // multi-step planning, complex recommendations
  | 'VISION'        // image understanding (later)
  | 'VOICE'         // realtime voice (later)

/** Which task class the router uses to pick a tier. */
export type CocoTaskClass =
  | 'A_DETERMINISTIC'   // no LLM needed (routed away by intent router)
  | 'B_RETRIEVAL'       // small model + RAG
  | 'C_GENERATION'      // general
  | 'D_REASONING'       // reasoning tier
  | 'E_AGENTIC'         // reasoning + tools
  | 'F_REALTIME_VOICE'  // voice pipeline

/** Message shape passed to the gateway. Provider-agnostic. */
export interface CocoModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** Optional tool call metadata for tool-role messages. */
  tool_call_id?: string
  name?: string
}

/** Tool definition passed to the gateway (subset of CocoToolDefinition). */
export interface CocoModelToolBinding {
  name: string
  description: string
  input_schema: unknown           // JSON-schema-compatible
}

/** Input to the gateway. */
export interface CocoModelRequest {
  tier: CocoModelTier
  task_class: CocoTaskClass
  messages: CocoModelMessage[]
  tools?: CocoModelToolBinding[]
  /** If provided, the gateway MUST return structured JSON matching the schema. */
  response_schema?: unknown
  temperature?: number
  max_tokens?: number
  stream?: boolean
  /** For observability + billing. */
  user_id: string
  conversation_id: string
  request_id: string
}

/** Non-streaming response. */
export interface CocoModelResponse {
  provider: string
  model_id: string
  content: string
  tool_calls?: Array<{
    call_id: string
    tool_name: string
    arguments: Record<string, unknown>
  }>
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'
  usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  latency_ms: number
}

/** Streaming chunk. */
export type CocoModelStreamChunk =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call_delta'; call_id: string; tool_name?: string; arguments_delta?: string }
  | { kind: 'tool_call_complete'; call_id: string; tool_name: string; arguments: Record<string, unknown> }
  | { kind: 'finish'; reason: CocoModelResponse['finish_reason']; usage?: CocoModelResponse['usage'] }
  | { kind: 'error'; code: string; message: string }

/** Provider health tracked by the router for fallback decisions. */
export interface CocoProviderHealth {
  provider: string
  available: boolean
  consecutive_failures: number
  last_failure_at?: string
  last_success_at?: string
  circuit_state: 'closed' | 'open' | 'half_open'
}