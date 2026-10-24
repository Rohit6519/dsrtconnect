// ============================================================
// components/coco/CocoPageAutoWire.tsx
// Client-side auto-wiring component. Mount once in AppShell.
// ============================================================

'use client'

import { useCocoAutoWire } from '@/lib/coco/sdk/useCocoAutoWire'

export function CocoPageAutoWire() {
  useCocoAutoWire()
  return null
}