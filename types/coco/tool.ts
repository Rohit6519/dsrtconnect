// ============================================================
// types/coco/tool.ts
// Tool Registry + tool call contracts.
// See COCO spec §16–§20.
// ============================================================

import type { CocoRiskLevel, ConfirmationPolicy, CocoPermissionScope } from './permission'

/**
 * JSON Schema-like descriptor for tool inputs/outputs.
 * We keep it minimal (not full JSON Schema) to reduce surface area.
 * The executor validates against this before dispatch.
 */
export type CocoSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'

export interface CocoParamSchema {
  type: CocoSchemaType | CocoSchemaType[]
  description?: string
  enum?: (string | number)[]
  format?: string                          // e.g. 'uuid', 'url', 'email'
  items?: CocoParamSchema                  // for arrays
  properties?: Record<string, CocoParamSchema>  // for objects
  required?: string[]                      // for objects
  min?: number
  max?: number
  default?: unknown
}

/** Complete tool definition — stored in `coco_tool_registry`. */
export interface CocoToolDefinition {
  /** Unique namespaced name, e.g. 'navigate.to' or 'mail.create_draft' */
  name: string
  /** Semantic version — bump when schema changes */
  version: string

  /** Human-readable description shown to the model. */
  description: string

  /** Category for UI grouping / observability. */
  category:
    | 'navigation'
    | 'read'
    | 'search'
    | 'ui'
    | 'write'
    | 'communication'
    | 'admin'
    | 'external'

  /** Input schema (validated before execution). */
  input_schema: CocoParamSchema

  /** Output schema (validated after execution). */
  output_schema: CocoParamSchema

  /** Risk classification. Drives confirmation UI. */
  risk_level: CocoRiskLevel

  /** Confirmation policy. Derived from risk unless overridden. */
  confirmation_policy: ConfirmationPolicy

  /** Required permission scopes — evaluated by the executor. */
  required_scopes: CocoPermissionScope[]

  /** Max execution time in ms. Hard-killed by the executor. */
  timeout_ms: number

  /** Whether this tool supports idempotency keys. */
  idempotent: boolean

  /** Whether automatic retry is safe. */
  auto_retry: boolean

  /** Whether the executor must verify DB state after success. */
  requires_verification: boolean

  /** Whether this tool is enabled in production. */
  enabled: boolean
}

/** A single tool invocation proposed by the model. */
export interface CocoToolCall {
  call_id: string
  tool_name: string
  tool_version: string
  arguments: Record<string, unknown>
  /** Optional idempotency key if the tool is idempotent. */
  idempotency_key?: string
}

/** Result returned by the executor. */
export interface CocoToolResult {
  call_id: string
  tool_name: string
  success: boolean
  output?: unknown
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  /** Populated when verification ran. */
  verified?: boolean
  /** Actual execution time in ms. */
  latency_ms: number
}

/** Public manifest exposed via GET /api/coco/tools. Never leaks scopes user lacks. */
export interface CocoToolManifest {
  name: string
  version: string
  description: string
  category: CocoToolDefinition['category']
  risk_level: CocoRiskLevel
  requires_confirmation: boolean
  input_schema: CocoParamSchema
}