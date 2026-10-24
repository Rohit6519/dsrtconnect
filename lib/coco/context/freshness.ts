// ============================================================
// lib/coco/context/freshness.ts
// Track per-slice freshness so the compiler / cache can reason about staleness.
// ============================================================

import type { CocoContextEnvelope, Timestamp } from '@/types/coco'

export function buildFreshnessMap(): CocoContextEnvelope['freshness'] {
  const now = new Date().toISOString() as Timestamp
  return {
    identity: now,
    entity: now,
    related: now,
    memory: now,
    knowledge: now,
  }
}