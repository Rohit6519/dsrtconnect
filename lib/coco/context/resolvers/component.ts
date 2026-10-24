// ============================================================
// lib/coco/context/resolvers/component.ts
// L2 — Component context.
// Consults an in-memory registry defined in the SDK (Phase 9).
// For v0.1 we accept the client-declared registry_id after sanitization.
// ============================================================

import type { CocoClientContextHint, ComponentContext } from '@/types/coco'

/**
 * Well-known component IDs COCO understands.
 * Extend as pages register themselves via the SDK.
 */
const KNOWN_COMPONENTS: Record<string, string[]> = {
  'project.overview': ['read', 'edit', 'analyze', 'invite_member'],
  'project.editor': ['read', 'edit'],
  'project.banner': ['read', 'replace'],
  'project.team': ['read', 'invite_member', 'remove_member'],
  'venture.assessment.question': ['read', 'explain', 'recommend', 'select'],
  'venture.overview': ['read', 'edit'],
  'venture.analytics': ['read', 'summarize'],
  'mail.composer': ['read', 'draft', 'send'],
  'mail.inbox': ['read', 'summarize'],
  'community.overview': ['read', 'join', 'follow'],
  'home.feed': ['read', 'summarize'],
  'profile.overview': ['read', 'edit'],
}

export function resolveComponent(hint: CocoClientContextHint): ComponentContext | undefined {
  if (!hint.component) return undefined

  const capabilities = KNOWN_COMPONENTS[hint.component.registry_id]

  return {
    registry_id: hint.component.registry_id,
    instance_id: hint.component.instance_id,
    capabilities,
  }
}