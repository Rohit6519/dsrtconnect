// ============================================================
// lib/community/service.announcements.ts
// Announcement service with fanout worker path.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from './permissions'

export interface CreateAnnouncementInput {
  community_id: string
  title: string
  body: string
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT'
  pinned?: boolean
  pin_expires_at?: string | null
  allow_comments?: boolean
  scheduled_for?: string | null
  expires_at?: string | null
}

export async function createAnnouncement(
  supabase: SupabaseClient,
  actorId: string,
  input: CreateAnnouncementInput,
  requestId?: string
): Promise<{ announcement_id: string; event_id: string }> {
  const canPublish = await hasCommunityPermission(
    supabase,
    actorId,
    input.community_id,
    COMMUNITY_PERMISSIONS.ANNOUNCEMENT_PUBLISH
  )
  if (!canPublish) throw new ForbiddenError('You cannot publish announcements')

  if (!input.title?.trim()) throw new ValidationError([{ field: 'title', message: 'Title required' }])
  if (!input.body?.trim()) throw new ValidationError([{ field: 'body', message: 'Body required' }])
  if (input.title.length > 300) throw new ValidationError([{ field: 'title', message: 'Title too long' }])

  const { data: community } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('id', input.community_id)
    .maybeSingle()
  if (!community) throw new NotFoundError('Community', input.community_id)

  const isScheduled = input.scheduled_for && new Date(input.scheduled_for) > new Date()

  const { data: ann, error } = await supabase
    .from('community_announcements')
    .insert({
      community_id: input.community_id,
      author_identity_id: actorId,
      title: input.title.trim(),
      body: input.body.trim(),
      priority: input.priority ?? 'NORMAL',
      status: isScheduled ? 'SCHEDULED' : 'PUBLISHED',
      pinned: !!input.pinned,
      pin_expires_at: input.pin_expires_at || null,
      allow_comments: input.allow_comments !== false,
      scheduled_for: input.scheduled_for || null,
      expires_at: input.expires_at || null,
      published_at: isScheduled ? null : new Date().toISOString(),
      fanout_status: isScheduled ? 'DEFERRED' : 'PENDING',
    })
    .select('*')
    .single()

  if (error || !ann) throw new Error(`Announcement failed: ${error?.message}`)

  await writeAudit(supabase, {
    actorId,
    action: 'community.announcement.published',
    entityType: 'community_announcement',
    entityId: ann.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
    after: { priority: ann.priority, pinned: ann.pinned },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.ANNOUNCEMENT_PUBLISHED,
    aggregateType: 'community_announcement',
    aggregateId: ann.id,
    actorId,
    payload: {
      community_id: input.community_id,
      community_slug: community.slug,
      community_name: community.name,
      announcement_id: ann.id,
      title: ann.title,
      priority: ann.priority,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { announcement_id: ann.id, event_id: eventId }
}

/**
 * Fanout worker — called by the outbox dispatcher.
 * Creates in-app notifications for every active member in batches.
 */
export async function fanoutAnnouncement(
  supabase: SupabaseClient,
  announcementId: string
): Promise<{ notified: number }> {
  const { data: ann } = await supabase
    .from('community_announcements')
    .select('*, communities(name, slug)')
    .eq('id', announcementId)
    .maybeSingle()
  if (!ann) return { notified: 0 }
  if (ann.fanout_status === 'COMPLETED') return { notified: 0 }

  // Lock (best effort)
  await supabase
    .from('community_announcements')
    .update({ fanout_status: 'RUNNING' })
    .eq('id', announcementId)

  const BATCH = 500
  let cursor: string | null = null
  let totalNotified = 0

  const communityName = (ann as any).communities?.name || 'community'
  const communitySlug = (ann as any).communities?.slug

  while (true) {
    let q = supabase
      .from('community_memberships')
      .select('identity_id, joined_at')
      .eq('community_id', ann.community_id)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: true })
      .limit(BATCH)
    if (cursor) q = q.gt('joined_at', cursor)
    const { data: batch } = await q
    if (!batch || batch.length === 0) break

    // Insert notifications in bulk
    const rows = batch
      .filter((m: any) => m.identity_id !== ann.author_identity_id)
      .map((m: any) => ({
        recipient_id: m.identity_id,
        user_id: m.identity_id,
        type: ann.priority === 'URGENT' ? 'community_announcement_urgent' : 'community_announcement',
        priority: ann.priority === 'URGENT' ? 'URGENT' : ann.priority === 'IMPORTANT' ? 'HIGH' : 'NORMAL',
        entity_type: 'community_announcement',
        entity_id: ann.id,
        title: `${communityName}: ${ann.title}`,
        body: ann.body.slice(0, 240),
        message: ann.body.slice(0, 240),
        action_url: communitySlug ? `/community/${communitySlug}` : null,
        from_user_id: ann.author_identity_id,
        icon: 'alert',
        read: false,
        read_at: null,
      }))

    if (rows.length > 0) {
      await supabase.from('notifications').insert(rows)
      totalNotified += rows.length
    }

    cursor = batch[batch.length - 1].joined_at
    if (batch.length < BATCH) break
  }

  await supabase
    .from('community_announcements')
    .update({
      fanout_status: 'COMPLETED',
      fanout_completed_at: new Date().toISOString(),
    })
    .eq('id', announcementId)

  return { notified: totalNotified }
}