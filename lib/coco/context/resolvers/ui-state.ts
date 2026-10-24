// ============================================================
// lib/coco/context/resolvers/ui-state.ts
// UI state passthrough. Already sanitized in security.ts.
// ============================================================

import type { CocoClientContextHint, UiStateContext } from '@/types/coco'

export function resolveUiState(hint: CocoClientContextHint): UiStateContext | undefined {
  return hint.ui_state
}