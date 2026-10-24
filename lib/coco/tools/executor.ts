// ============================================================
// lib/coco/tools/executor.ts
// Executes tool calls with strict permission validation & audit logging.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type {
  CocoToolCall,
  CocoToolResult,
  CocoPermissionScope,
  UUID
} from '@/types/coco'

import { validateToolArguments } from './validator'
import { verifyToolExecution } from './verifier'
import { toolHandlers } from './definitions'

export interface ExecuteToolParams {
  userId: UUID
  conversationId: UUID
  toolCall: CocoToolCall
  userScopes: CocoPermissionScope[]
  requestId: string
}

export async function executeTool(params: ExecuteToolParams): Promise<CocoToolResult> {
  const { userId, conversationId, toolCall, userScopes, requestId } = params
  const startTime = Date.now()

  // 1. Fetch tool definition
  const { data: toolDef } = await adminClient
    .from('coco_tool_registry')
    .select('*')
    .eq('name', toolCall.tool_name)
    .eq('enabled', true)
    .maybeSingle()

  if (!toolDef) {
    return {
      call_id: toolCall.call_id,
      tool_name: toolCall.tool_name,
      success: false,
      error: { code: 'COCO_TOOL_NOT_FOUND', message: `Tool '${toolCall.tool_name}' not found or disabled` },
      latency_ms: Date.now() - startTime
    }
  }

  // 2. Permission check
  const reqScopes: CocoPermissionScope[] = toolDef.required_scopes || []
  const userScopeSet = new Set(userScopes)
  const missingScopes = reqScopes.filter(s => !userScopeSet.has(s))

  if (missingScopes.length > 0) {
    await logAudit(userId, conversationId, 'permission.denied', toolCall.tool_name, requestId, { missingScopes })
    return {
      call_id: toolCall.call_id,
      tool_name: toolCall.tool_name,
      success: false,
      error: { code: 'COCO_PERMISSION_DENIED', message: `Missing required permission scope(s): ${missingScopes.join(', ')}` },
      latency_ms: Date.now() - startTime
    }
  }

  // 3. Argument schema validation
  const valResult = validateToolArguments(toolCall.arguments, toolDef.input_schema)
  if (!valResult.valid) {
    return {
      call_id: toolCall.call_id,
      tool_name: toolCall.tool_name,
      success: false,
      error: { code: 'COCO_TOOL_SCHEMA_INVALID', message: `Validation error: ${valResult.errors.join('; ')}` },
      latency_ms: Date.now() - startTime
    }
  }

  // 4. Handler execution
  const handler = toolHandlers[toolCall.tool_name]
  if (!handler) {
    return {
      call_id: toolCall.call_id,
      tool_name: toolCall.tool_name,
      success: false,
      error: { code: 'COCO_NOT_IMPLEMENTED', message: `No code handler bound to tool '${toolCall.tool_name}'` },
      latency_ms: Date.now() - startTime
    }
  }

  try {
    // Wrap handler execution with a configurable timeout
    const timeoutMs = toolDef.timeout_ms || 15000
    const rawOutput = await Promise.race([
      handler(toolCall.arguments, userId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Tool timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ])

    // 5. Verification check
    let verified = false
    if (toolDef.requires_verification) {
      const verResult = await verifyToolExecution(toolCall.tool_name, rawOutput, userId)
      verified = verResult.passed
    }

    const latency_ms = Date.now() - startTime

    // 6. Audit logging
    await logAudit(userId, conversationId, 'tool.executed', toolCall.tool_name, requestId, { success: true, latency_ms })

    return {
      call_id: toolCall.call_id,
      tool_name: toolCall.tool_name,
      success: true,
      output: rawOutput,
      verified: toolDef.requires_verification ? verified : undefined,
      latency_ms
    }
  } catch (err: any) {
    const latency_ms = Date.now() - startTime
    await logAudit(userId, conversationId, 'tool.failed', toolCall.tool_name, requestId, { error: err.message })

    return {
      call_id: toolCall.call_id,
      tool_name: toolCall.tool_name,
      success: false,
      error: { code: 'COCO_TOOL_EXECUTION_FAILED', message: err.message },
      latency_ms
    }
  }
}

async function logAudit(
  userId: string,
  conversationId: string,
  eventType: string,
  toolName: string,
  requestId: string,
  details: Record<string, unknown>
) {
  try {
    await adminClient.from('coco_audit_logs').insert({
      user_id: userId,
      conversation_id: conversationId,
      event_type: eventType,
      tool_name: toolName,
      request_id: requestId,
      details
    })
  } catch (err) {
    console.error('[COCO Executor] Failed to log audit:', err)
  }
}