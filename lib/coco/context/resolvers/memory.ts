// ============================================================
// lib/coco/context/resolvers/memory.ts
// L5 — Memory context.
// Surfaces relevant memory items with provenance intact.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { MemoryContext, UUID, EntityContext } from '@/types/coco'

const MEMORY_LIMIT = 10

export async function resolveMemory(
  userId: UUID,
  entity: EntityContext | undefined
): Promise<MemoryContext | undefined> {
  const now = new Date().toISOString()

  // Fetch explicit + preference memory that hasn't expired
  const { data } = await adminClient
    .from('coco_memory')
    .select('key, value, source, confidence, expires_at')
    .eq('user_id', userId)
    .in('type', ['explicit', 'preference'])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('confidence', { ascending: false })
    .limit(MEMORY_LIMIT)

  if (!data || data.length === 0) return undefined

  // Update access counters async (fire and forget)
  Promise.resolve().then(() => {
    adminClient
      .from('coco_memory')
      .update({ access_count: 1, last_accessed_at: now })
      .eq('user_id', userId)
      .in('key', data.map(d => d.key))
      .then(() => {}, () => {})
  })

  return {
    items: data.map(d => ({
      key: d.key,
      value: d.value,
      source: d.source,
      confidence: d.confidence,
    })),
  }
}