// ============================================================
// lib/coco/messages/store.ts
// Database operations for messages and conversations.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { UUID, CocoMessageContent, CocoMessageRole, CocoMessageType } from '@/types/coco'

export async function ensureConversation(userId: UUID, conversationId?: UUID): Promise<UUID> {
  if (conversationId) {
    // Verify it exists and belongs to user
    const { data } = await adminClient
      .from('coco_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle()
    if (data) return data.id
  }

  // Create new
  const { data, error } = await adminClient
    .from('coco_conversations')
    .insert({ user_id: userId, title: 'New Conversation' })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create conversation: ${error.message}`)
  return data.id
}

export async function saveMessage(params: {
  userId: UUID
  conversationId: UUID
  role: CocoMessageRole
  type: CocoMessageType
  content: CocoMessageContent
  contextSnapshotId?: UUID
}): Promise<UUID> {
  const { data, error } = await adminClient
    .from('coco_messages')
    .insert({
      user_id: params.userId,
      conversation_id: params.conversationId,
      role: params.role,
      message_type: params.type,
      content: params.content as any,
      context_snapshot_id: params.contextSnapshotId || null
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save message: ${error.message}`)
  return data.id
}

export async function getConversationHistory(conversationId: UUID, limit = 20) {
  const { data } = await adminClient
    .from('coco_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).reverse() // Return chronological
}