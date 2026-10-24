// ============================================================
// lib/coco/tools/registry.ts
// Loads active tools from DB and maps parameters for Model Gateway.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { CocoToolDefinition, CocoModelToolBinding, CocoPermissionScope } from '@/types/coco'
import { teamCapacityToolDef, executeTeamCapacity } from './definitions/team_capacity'

// ═══════════════════════════════════════════════════════════════════════════
// STATIC TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const COCO_TOOLS: CocoToolDefinition[] = [
  teamCapacityToolDef,
]

// ═══════════════════════════════════════════════════════════════════════════
// TOOL DISCOVERY & BINDINGS
// ═══════════════════════════════════════════════════════════════════════════

export async function getActiveToolsForUser(
  userScopes: CocoPermissionScope[]
): Promise<CocoToolDefinition[]> {
  const { data, error } = await adminClient
    .from('coco_tool_registry')
    .select('*')
    .eq('enabled', true)

  if (error || !data) {
    console.error('[COCO Registry] Failed to load tools from database:', error?.message)
    // Fallback to in-memory static tool definitions
    const userScopeSet = new Set(userScopes)
    return COCO_TOOLS.filter(tool => {
      const reqScopes: string[] = tool.required_scopes || []
      return reqScopes.every(scope => userScopeSet.has(scope as CocoPermissionScope))
    })
  }

  const userScopeSet = new Set(userScopes)

  // Filter out tools requiring permission scopes the user lacks
  return (data as any[])
    .filter(tool => {
      const reqScopes: string[] = tool.required_scopes || []
      return reqScopes.every(scope => userScopeSet.has(scope as CocoPermissionScope))
    })
    .map(tool => ({
      name: tool.name,
      version: tool.version,
      description: tool.description,
      category: tool.category,
      input_schema: tool.input_schema,
      output_schema: tool.output_schema,
      risk_level: tool.risk_level,
      confirmation_policy: tool.confirmation_policy,
      required_scopes: tool.required_scopes,
      timeout_ms: tool.timeout_ms,
      idempotent: tool.idempotent,
      auto_retry: tool.auto_retry,
      requires_verification: tool.requires_verification,
      enabled: tool.enabled
    }))
}

export function formatToolsForModel(tools: CocoToolDefinition[]): CocoModelToolBinding[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function executeTool(name: string, args: any, context?: any): Promise<any> {
  switch (name) {
    case 'analyze_team_capacity': {
      // If project_id isn't explicitly passed in args, pull it from the context (e.g. CocoPageInjector)
      const projectId = args?.project_id || context?.entity?.id || context?.projectId
      if (!projectId) {
        return JSON.stringify({ error: 'Project ID is required to analyze team capacity' })
      }
      return await executeTeamCapacity({ ...args, project_id: projectId })
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}