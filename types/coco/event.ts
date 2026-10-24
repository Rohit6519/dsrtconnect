// ============================================================
// types/coco/event.ts
// Streaming event protocol for SSE responses.
// ============================================================

import type { UUID, Timestamp, ConversationId, MessageId, ActionRunId } from './primitives'
import type { CocoMessageContent } from './message'

/**
 * Every SSE event emitted by /api/coco/messages/stream.
 * The client narrows on `event`.
 */
export type CocoStreamEvent =
  | { event: 'stream.start'; request_id: string; timestamp: Timestamp; data: { conversation_id: ConversationId; assistant_message_id: MessageId } }
  | { event: 'message.delta'; request_id: string; timestamp: Timestamp; data: { text: string } }
  | { event: 'tool.started'; request_id: string; timestamp: Timestamp; data: { call_id: string; tool_name: string } }
  | { event: 'tool.completed'; request_id: string; timestamp: Timestamp; data: { call_id: string; tool_name: string; success: boolean } }
  | { event: 'action.proposed'; request_id: string; timestamp: Timestamp; data: { action_run_id: ActionRunId; tool_name: string; summary: string; requires_confirmation: boolean } }
  | { event: 'action.confirmation_required'; request_id: string; timestamp: Timestamp; data: { action_run_id: ActionRunId } }
  | { event: 'action.completed'; request_id: string; timestamp: Timestamp; data: { action_run_id: ActionRunId; verified: boolean } }
  | { event: 'action.failed'; request_id: string; timestamp: Timestamp; data: { action_run_id: ActionRunId; error: { code: string; message: string } } }
  | { event: 'action.client_bridge'; request_id: string; timestamp: Timestamp; data: { output: unknown } }
  | { event: 'message.completed'; request_id: string; timestamp: Timestamp; data: { assistant_message_id: MessageId; content: CocoMessageContent } }
  | { event: 'stream.end'; request_id: string; timestamp: Timestamp; data: { reason: 'completed' | 'cancelled' | 'error' } }
  | { event: 'error'; request_id: string; timestamp: Timestamp; data: { code: string; message: string } }

export type CocoStreamEventName = CocoStreamEvent['event']

/** Utility: extract the `data` payload for a given event name. */
export type CocoStreamEventData<E extends CocoStreamEventName> =
  Extract<CocoStreamEvent, { event: E }>['data']