// ============================================================
// types/coco/memory.ts
// Memory system types — with mandatory provenance.
// See COCO spec §14, §25, §26.
// ============================================================

import type { UUID, Timestamp } from './primitives'

export type CocoMemoryType =
  | 'explicit'              // User explicitly said "remember X"
  | 'preference'            // Inferred preference with high confidence
  | 'workflow'              // Repeated task pattern
  | 'conversation_summary'  // Compressed prior conversation
  | 'session'               // Ephemeral, scoped to session

export type CocoMemorySource =
  | 'explicit_user_statement'
  | 'inferred_from_behavior'
  | 'inferred_from_action'
  | 'system_generated'
  | 'user_settings'

export interface CocoMemoryItem {
  id: UUID
  user_id: UUID
  type: CocoMemoryType
  key: string
  value: string
  source: CocoMemorySource
  /** 0.0 – 1.0. Explicit statements = 1.0. Inferred = lower. */
  confidence: number
  created_at: Timestamp
  updated_at: Timestamp
  /** Optional expiry for session/short-term memory. */
  expires_at?: Timestamp | null
  /** Times this memory has been surfaced to the model. */
  access_count: number
  last_accessed_at?: Timestamp | null
}

/** Write shape for creating/updating memory. */
export interface CocoMemoryWrite {
  type: CocoMemoryType
  key: string
  value: string
  source: CocoMemorySource
  confidence: number
  expires_at?: Timestamp | null
}