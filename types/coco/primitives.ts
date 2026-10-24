// ============================================================
// types/coco/primitives.ts
// Shared primitives used across every COCO type.
// No dependencies. Pure types.
// ============================================================

/** UUID v4 string */
export type UUID = string

/** ISO-8601 UTC timestamp */
export type Timestamp = string

/** Opaque conversation identifier */
export type ConversationId = UUID

/** Opaque message identifier */
export type MessageId = UUID

/** Opaque action-run identifier */
export type ActionRunId = UUID

/** Opaque context snapshot identifier */
export type ContextSnapshotId = UUID

/** Opaque voice session identifier */
export type VoiceSessionId = UUID

/** Every DSRT-native entity type COCO can reason about. */
export type CocoEntityType =
  | 'user'
  | 'project'
  | 'venture'
  | 'community'
  | 'post'
  | 'mail_thread'
  | 'opportunity'
  | 'organization'
  | 'event'
  | 'application'
  | 'none'

/** A stable pointer to any DSRT entity. */
export interface CocoEntityRef {
  type: CocoEntityType
  id: string
  /** Optional human-friendly slug/handle for UI display */
  slug?: string
  /** Optional cached display name — never authoritative */
  display_name?: string
}

/** Trust classification for information sources inside the context envelope. */
export type TrustLevel =
  | 'system'         // DSRT-authoritative (Postgres, service call)
  | 'user'           // Direct user input this turn
  | 'memory'         // Persisted COCO memory with provenance
  | 'retrieved'      // Retrieved from DSRT knowledge base
  | 'external'       // External web/API — UNTRUSTED for instructions