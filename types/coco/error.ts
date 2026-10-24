// ============================================================
// types/coco/error.ts
// COCO-specific error codes. Extends kernel error patterns.
// ============================================================

export type CocoErrorCode =
  // Auth / identity
  | 'COCO_UNAUTHENTICATED'
  | 'COCO_FORBIDDEN'
  // Request shape
  | 'COCO_INVALID_REQUEST'
  | 'COCO_CONTEXT_INVALID'
  // Model gateway
  | 'COCO_MODEL_UNAVAILABLE'
  | 'COCO_MODEL_TIMEOUT'
  | 'COCO_MODEL_RATE_LIMITED'
  | 'COCO_ALL_PROVIDERS_EXHAUSTED'
  // Tools
  | 'COCO_TOOL_NOT_FOUND'
  | 'COCO_TOOL_SCHEMA_INVALID'
  | 'COCO_TOOL_EXECUTION_FAILED'
  | 'COCO_TOOL_VERIFICATION_FAILED'
  | 'COCO_TOOL_TIMEOUT'
  // Actions
  | 'COCO_ACTION_NOT_FOUND'
  | 'COCO_ACTION_ALREADY_RESOLVED'
  | 'COCO_ACTION_CONFIRMATION_REQUIRED'
  | 'COCO_ACTION_EXPIRED'
  | 'COCO_ACTION_CANCELLED'
  // Permissions / risk
  | 'COCO_PERMISSION_DENIED'
  | 'COCO_RISK_THRESHOLD_EXCEEDED'
  // Memory
  | 'COCO_MEMORY_NOT_FOUND'
  // Retrieval
  | 'COCO_RETRIEVAL_FAILED'
  // Voice
  | 'COCO_VOICE_SESSION_EXPIRED'
  // Generic
  | 'COCO_INTERNAL_ERROR'
  | 'COCO_NOT_IMPLEMENTED'

/** Standard COCO error envelope — mirrors kernel `fail()` output. */
export interface CocoErrorEnvelope {
  error: {
    code: CocoErrorCode
    message: string
    request_id?: string
    details?: Record<string, unknown>
  }
}