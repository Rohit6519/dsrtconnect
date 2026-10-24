// ============================================================
// types/coco/action.ts
// Action lifecycle — every tool call is wrapped in an Action Run.
// See COCO spec §19, §21, §50.
// ============================================================

import type { UUID, Timestamp, ActionRunId, ConversationId, MessageId } from './primitives'
import type { CocoRiskLevel } from './permission'
import type { CocoToolCall, CocoToolResult } from './tool'

/**
 * Action lifecycle state machine.
 * See COCO spec §19.
 */
export type CocoActionStatus =
  | 'proposed'                 // Model produced a tool call
  | 'awaiting_confirmation'    // Waiting for user approval (R3/R4)
  | 'authorized'               // Permission + confirmation cleared
  | 'executing'                // In flight
  | 'verifying'                // Post-execution verification
  | 'completed'                // Success + verified
  | 'failed'                   // Execution or verification failed
  | 'cancelled'                // User cancelled or superseded
  | 'expired'                  // Confirmation timed out

/**
 * An Action Run — the durable, auditable record of a tool invocation.
 * Persisted in `coco_action_runs`.
 */
export interface CocoActionRun {
  id: ActionRunId
  user_id: UUID
  conversation_id: ConversationId
  proposing_message_id: MessageId

  tool_name: string
  tool_version: string
  risk_level: CocoRiskLevel

  status: CocoActionStatus

  /** The exact tool call the model proposed. */
  proposed_call: CocoToolCall

  /** The result once executed (null until completed/failed). */
  result?: CocoToolResult | null

  /** Whether the user has confirmed (only relevant for R3/R4). */
  confirmed: boolean
  confirmed_at?: Timestamp | null

  /**
   * Human-readable summary shown in the confirmation card.
   * E.g. "Send email to Robotic Rocks (subject: Connection Request)"
   */
  summary: string

  /** For confirmation TTL. */
  expires_at?: Timestamp | null

  proposed_at: Timestamp
  started_at?: Timestamp | null
  completed_at?: Timestamp | null

  /** Populated on failure. */
  error?: {
    code: string
    message: string
  } | null

  /** Verification outcome, if applicable. */
  verification?: {
    passed: boolean
    checks: string[]
    details?: Record<string, unknown>
  } | null
}

/** Request to confirm a pending action. */
export interface ConfirmActionRequest {
  action_run_id: ActionRunId
  confirmed: boolean
  /** Optional user-provided reason (e.g. cancellation reason). */
  reason?: string
}

/** Response after confirmation. */
export interface ConfirmActionResponse {
  action_run_id: ActionRunId
  status: CocoActionStatus
}