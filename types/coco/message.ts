// ============================================================
// types/coco/message.ts
// Conversation + message shapes.
// Mirrors `coco_conversations` and `coco_messages` tables (Phase 1).
// ============================================================

import type {
  UUID,
  Timestamp,
  ConversationId,
  MessageId,
  ContextSnapshotId,
  ActionRunId,
} from './primitives'

export type CocoMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type CocoMessageType =
  | 'text'
  | 'voice_transcript'
  | 'tool_call'
  | 'tool_result'
  | 'action_proposal'
  | 'action_confirmation'
  | 'error'
  | 'system_notice'

export type CocoConversationStatus = 'active' | 'archived' | 'deleted'

/** A conversation container. */
export interface CocoConversation {
  id: ConversationId
  user_id: UUID
  title: string | null
  status: CocoConversationStatus
  created_at: Timestamp
  updated_at: Timestamp
  /** Last message excerpt for list rendering. */
  last_message_preview?: string | null
  last_message_at?: Timestamp | null
  message_count: number
  metadata?: Record<string, unknown>
}

/**
 * Structured payloads for typed messages.
 * Kept as a discriminated union so consumers can narrow safely.
 */
export type CocoMessageContent =
  | { kind: 'text'; text: string }
  | { kind: 'voice_transcript'; text: string; audio_ref?: string }
  | { kind: 'tool_call'; tool_name: string; arguments: Record<string, unknown> }
  | { kind: 'tool_result'; tool_name: string; result: unknown; success: boolean }
  | { kind: 'action_proposal'; action_run_id: ActionRunId; summary: string }
  | { kind: 'action_confirmation'; action_run_id: ActionRunId; confirmed: boolean }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'system_notice'; text: string }

/** One record in `coco_messages`. */
export interface CocoMessage {
  id: MessageId
  conversation_id: ConversationId
  role: CocoMessageRole
  message_type: CocoMessageType
  content: CocoMessageContent

  /** For tool_call → tool_result linking. */
  tool_call_id?: string | null

  /** Snapshot of the context envelope used for this turn (foreign key). */
  context_snapshot_id?: ContextSnapshotId | null

  /** Which model produced this message (null for user/tool messages). */
  model?: string | null

  /** Token accounting for assistant messages. */
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  } | null

  created_at: Timestamp
  metadata?: Record<string, unknown>
}

/** Request payload: user sends a message. */
export interface SendMessageRequest {
  conversation_id?: ConversationId   // If omitted → create new
  text: string
  /** Client-provided page context hint (server re-resolves entities). */
  context_hint: import('./context').CocoClientContextHint
  /** Idempotency key for retries. */
  idempotency_key?: string
}

/** Response for non-streaming send. Streaming uses the event protocol. */
export interface SendMessageResponse {
  conversation_id: ConversationId
  message_id: MessageId
  assistant_message_id: MessageId
  content: CocoMessageContent
}