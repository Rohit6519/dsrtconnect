// ============================================================
// lib/coco/context/resolvers/navigation.ts
// L1 — Navigation context (route + page + breadcrumb).
// ============================================================

import type { CocoClientContextHint, NavigationContext } from '@/types/coco'

export function resolveNavigation(hint: CocoClientContextHint): NavigationContext {
  // Build breadcrumb from route segments
  const segments = hint.route
    .split('/')
    .filter(s => s.length > 0 && !s.startsWith('('))
    .slice(0, 8)

  return {
    route: hint.route,
    page: hint.page,
    breadcrumb: segments.length > 0 ? segments : undefined,
  }
}