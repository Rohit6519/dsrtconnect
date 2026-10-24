// ============================================================
// lib/coco/context/snapshot.ts
// Persist immutable envelope snapshots for auditability.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { CocoContextEnvelope, UUID, ConversationId } from '@/types/coco'

export async function persistSnapshot(
  envelope: CocoContextEnvelope,
  userId: UUID,
  conversationId?: ConversationId
): Promise<UUID | null> {
  try {
    const { data, error } = await adminClient
      .from('coco_context_snapshots')
      .insert({
        id: envelope.snapshot_id,
        user_id: userId,
        conversation_id: conversationId || null,
        envelope: envelope as unknown as object,
        route: envelope.navigation.route,
        page: envelope.navigation.page,
        entity_type: envelope.entity?.type || null,
        entity_id: envelope.entity?.id || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[COCO Context] Snapshot persist failed:', error.message)
      return null
    }

    return data?.id || null
  } catch (err) {
    console.error('[COCO Context] Snapshot persist exception:', err)
    return null
  }
}