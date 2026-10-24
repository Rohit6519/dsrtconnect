// ============================================================
// types/coco/permission.ts
// Permission model + risk classification.
// COCO must NEVER enforce permissions in the model layer.
// The tool executor is the sole enforcement point.
// ============================================================

/**
 * Risk levels for every tool/action.
 * See COCO spec §22.
 */
export type CocoRiskLevel =
  | 'R0'  // Read-only (search, view, summarize)                     → no confirm
  | 'R1'  // Local UI (navigate, focus, scroll)                       → no confirm
  | 'R2'  // Reversible modification (fill form, save draft)          → no confirm (default)
  | 'R3'  // External communication (send mail, publish, invite)      → CONFIRM
  | 'R4'  // Destructive / security / financial                       → STRONG CONFIRM

/** Confirmation policy attached to a tool definition. */
export type ConfirmationPolicy =
  | 'never'          // R0, R1
  | 'default'        // R2 — auto-confirmed unless user disabled
  | 'required'       // R3
  | 'strong'         // R4 — requires explicit re-authentication or double-confirm

/**
 * COCO-native permission scopes.
 * These are logical scopes evaluated against Supabase RLS + service-layer checks.
 * COCO never grants itself a permission; it can only exercise what the user has.
 */
export type CocoPermissionScope =
  // Read scopes
  | 'read:self'
  | 'read:projects'
  | 'read:ventures'
  | 'read:communities'
  | 'read:mail'
  | 'read:network'
  | 'read:posts'
  // Navigate
  | 'ui:navigate'
  | 'ui:manipulate'
  // Write scopes
  | 'write:project'
  | 'write:venture'
  | 'write:post_draft'
  | 'write:mail_draft'
  // Communicate
  | 'send:mail'
  | 'send:connection_request'
  | 'send:invitation'
  | 'publish:post'
  // High-risk
  | 'delete:project'
  | 'delete:venture'
  | 'security:manage'

/** Result of a permission evaluation. */
export interface PermissionEvaluation {
  allowed: boolean
  scope: CocoPermissionScope
  reason?: string
  /** If denied, the code the executor should surface. */
  denial_code?: 'COCO_PERMISSION_DENIED' | 'COCO_RISK_THRESHOLD_EXCEEDED'
}

/** Session-level user permission set — resolved server-side, never trusted from client. */
export interface UserPermissionSet {
  user_id: string
  scopes: CocoPermissionScope[]
  /** Whether user has opted into auto-confirmation for R2 actions. */
  auto_confirm_r2: boolean
  /** Whether user has enabled proactive COCO suggestions. */
  proactive_enabled: boolean
}