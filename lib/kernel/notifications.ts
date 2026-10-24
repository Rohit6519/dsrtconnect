// ============================================================
// lib/kernel/notifications.ts
// Kernel Notification Service.
// Dual-column compatible with the existing notifications table.
//
// The notifications table has BOTH old and new columns kept in sync
// by a DB trigger:  user_id ↔ recipient_id   read (boolean) ↔ read_at (timestamptz)
// We always WRITE to the new columns; the trigger fills the old ones.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface CreateNotificationParams {
  recipientId: string
  type: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  entityType?: string | null
  entityId?: string | null
  title: string
  body?: string | null
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
  fromUserId?: string | null
  icon?: string | null
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<string> {
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: params.recipientId,
      user_id: params.recipientId, // sync trigger keeps both columns aligned
      type: params.type,
      priority: params.priority ?? 'NORMAL',
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      title: params.title,
      body: params.body ?? null,
      message: params.body ?? null, // legacy column preserved
      action_url: params.actionUrl ?? null,
      metadata: params.metadata ?? null,
      from_user_id: params.fromUserId ?? null,
      icon: params.icon ?? null,
      read: false,
      read_at: null,
      created_at: nowIso,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[notifications:create_failed]', error)
    throw new Error(`Failed to create notification: ${error.message}`)
  }

  return data.id
}

/**
 * Mark a single notification as read.
 * Safe: filters by BOTH recipient_id and user_id in a single ownership check
 * so nobody can read-mark somebody else's notification.
 */
export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  recipientId: string
): Promise<void> {
  const nowIso = new Date().toISOString()

  // Ownership check first (avoids the fragile chained .or() problem)
  const { data: owned } = await supabase
    .from('notifications')
    .select('id')
    .eq('id', notificationId)
    .or(`recipient_id.eq.${recipientId},user_id.eq.${recipientId}`)
    .maybeSingle()

  if (!owned) {
    // Silent no-op — same behavior as before, but never mutates another user's row
    return
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: nowIso })
    .eq('id', notificationId)

  if (error) {
    throw new Error(`Failed to mark notification read: ${error.message}`)
  }
}

/**
 * Mark ALL of this user's unread notifications as read.
 *
 * Previously used `.or()` chained twice which Supabase flattens into a single
 * OR across all clauses — that would have marked EVERY unread notification in
 * the entire DB as read. Now we scope by recipient FIRST, then update by id.
 */
export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  recipientId: string
): Promise<{ updated: number }> {
  const nowIso = new Date().toISOString()

  // 1. Get the id list this user owns and hasn't read yet.
  //    We can't safely mix (recipient OR user) with (read=false OR read_at IS NULL)
  //    in a single Supabase .or() call, so we split into two passes and union.
  const { data: byRecipient } = await supabase
    .from('notifications')
    .select('id')
    .eq('recipient_id', recipientId)
    .or('read.eq.false,read_at.is.null')
    .limit(500)

  const { data: byUser } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', recipientId)
    .or('read.eq.false,read_at.is.null')
    .limit(500)

  const ids = Array.from(
    new Set([
      ...(byRecipient || []).map((r: any) => r.id),
      ...(byUser || []).map((r: any) => r.id),
    ])
  )

  if (ids.length === 0) return { updated: 0 }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: nowIso })
    .in('id', ids)

  if (error) {
    throw new Error(`Failed to mark all notifications read: ${error.message}`)
  }

  return { updated: ids.length }
}

/**
 * Count unread notifications for a specific recipient — never global.
 */
export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  recipientId: string
): Promise<number> {
  // Same split-then-dedupe approach for correctness
  const [{ data: r1 }, { data: r2 }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id')
      .eq('recipient_id', recipientId)
      .or('read.eq.false,read_at.is.null'),
    supabase
      .from('notifications')
      .select('id')
      .eq('user_id', recipientId)
      .or('read.eq.false,read_at.is.null'),
  ])

  const unique = new Set([
    ...(r1 || []).map((r: any) => r.id),
    ...(r2 || []).map((r: any) => r.id),
  ])
  return unique.size
}