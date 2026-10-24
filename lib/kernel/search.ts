// ============================================================
// lib/kernel/search.ts
// Kernel Search Index Queue Producer.
//
// The partial unique index `uq_search_queue_pending_per_entity` allows AT MOST
// one PENDING row per (entity_type, entity_id). Non-pending rows (DONE / FAILED)
// are historical and don't participate in uniqueness.
//
// Supabase's .upsert(..., { onConflict }) does NOT understand partial indexes,
// so we can't rely on it. Instead we do:
//   1. Insert a new PENDING row.
//   2. If the insert hits a unique violation (a PENDING row already exists),
//      update THAT row's priority / operation instead.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface QueueSearchIndexParams {
  entityType: string
  entityId: string
  operation?: 'INDEX' | 'REINDEX' | 'DELETE'
  priority?: number
}

export async function queueSearchIndex(
  supabase: SupabaseClient,
  params: QueueSearchIndexParams
): Promise<void> {
  const row = {
    entity_type: params.entityType,
    entity_id: params.entityId,
    operation: params.operation ?? 'INDEX',
    priority: params.priority ?? 0,
    status: 'PENDING' as const,
    created_at: new Date().toISOString(),
  }

  const { error: insErr } = await supabase.from('kernel_search_index_queue').insert(row)

  if (!insErr) return

  // 23505 = unique violation → an existing PENDING row is already there
  if ((insErr as any).code !== '23505') {
    console.warn('[search:queue_insert_failed]', insErr.message)
    return
  }

  // Bump the existing PENDING row to the highest requested priority + latest operation
  await supabase
    .from('kernel_search_index_queue')
    .update({
      operation: row.operation,
      priority: row.priority,
    })
    .eq('entity_type', params.entityType)
    .eq('entity_id', params.entityId)
    .eq('status', 'PENDING')
}