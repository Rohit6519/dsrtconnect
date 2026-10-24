// ============================================================
// lib/coco/permissions/risk.ts
// Evaluates confirmation policies for tool execution.
// ============================================================

import type { CocoRiskLevel, ConfirmationPolicy, UserPermissionSet } from '@/types/coco'

export interface RiskEvaluation {
  requires_confirmation: boolean
  reason: string
}

/**
 * Determines if an action requires explicit user confirmation before executing.
 */
export function evaluateConfirmationRequirement(
  riskLevel: CocoRiskLevel,
  policy: ConfirmationPolicy,
  userSettings: UserPermissionSet
): RiskEvaluation {
  // 1. Strict Overrides
  if (policy === 'never') {
    return { requires_confirmation: false, reason: 'policy_never' }
  }
  if (policy === 'strong' || policy === 'required') {
    return { requires_confirmation: true, reason: `policy_${policy}` }
  }

  // 2. Default Risk-Based Evaluation
  switch (riskLevel) {
    case 'R0':
    case 'R1':
      return { requires_confirmation: false, reason: 'low_risk' }
    
    case 'R2':
      // R2 (Drafts, Form fills) is auto-confirmed IF the user hasn't disabled it
      if (userSettings.auto_confirm_r2) {
        return { requires_confirmation: false, reason: 'user_auto_confirm_enabled' }
      }
      return { requires_confirmation: true, reason: 'user_auto_confirm_disabled' }
      
    case 'R3':
    case 'R4':
      // High risk ALWAYS requires confirmation, ignoring user preferences
      return { requires_confirmation: true, reason: 'high_risk_enforced' }
      
    default:
      // Fail safe: if unknown, require confirmation
      return { requires_confirmation: true, reason: 'unknown_risk' }
  }
}