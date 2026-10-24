// ============================================================
// lib/community/activity-consumers.ts
// Registers outbox handlers that project community events
// into community_activity_projection (the network activity read model).
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { registerEventHandler, KernelEventEnvelope, KERNEL_EVENT_TYPES } from '@/lib/kernel'

async function upsertActivity(
  supabase: SupabaseClient,
  args: {
    event: KernelEventEnvelope
    verb: string
    objectType?: string
    objectId?: string | null
    subjectIdentityId?: string | null
    visibility?: 'PUBLIC' | 'MEMBERS' | 'PRIVATE'
    metadata?: Record<string, unknown>
  }
) {
  const payload: any = args.event.payload || {}
  const communityId =
    payload.community_id ||
    (args.event.aggregate_type === 'community' ? args.event.aggregate_id : null)

  if (!communityId) return

  await supabase
    .from('community_activity_projection')
    .upsert(
      {
        community_id: communityId,
        actor_id: args.event.actor_id,
        verb: args.verb,
        object_type: args.objectType ?? args.event.aggregate_type,
        object_id: args.objectId ?? args.event.aggregate_id,
        subject_identity_id: args.subjectIdentityId ?? null,
        visibility: args.visibility ?? 'MEMBERS',
        metadata: args.metadata ?? payload,
        event_id: args.event.event_id,
        occurred_at: args.event.occurred_at,
      },
      { onConflict: 'event_id' }
    )
}

let registered = false

/**
 * Idempotent — register community activity consumers exactly once.
 * Safe to call from any server entrypoint.
 */
export function registerCommunityActivityConsumers() {
  if (registered) return
  registered = true

  // Community lifecycle
  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_CREATED, async (event, supabase) => {
    await upsertActivity(supabase, { event, verb: 'community.created', visibility: 'PUBLIC' })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_PUBLISHED, async (event, supabase) => {
    await upsertActivity(supabase, { event, verb: 'community.published', visibility: 'PUBLIC' })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_ARCHIVED, async (event, supabase) => {
    await upsertActivity(supabase, { event, verb: 'community.archived', visibility: 'PUBLIC' })
  })

  // Membership
  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_JOINED, async (event, supabase) => {
    await upsertActivity(supabase, {
      event,
      verb: 'community.member.joined',
      subjectIdentityId: (event.payload as any)?.identity_id ?? event.actor_id,
      visibility: 'MEMBERS',
    })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_LEFT, async (event, supabase) => {
    await upsertActivity(supabase, {
      event,
      verb: 'community.member.left',
      subjectIdentityId: (event.payload as any)?.identity_id ?? event.actor_id,
      visibility: 'MEMBERS',
    })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_JOIN_REQUESTED, async (event, supabase) => {
    await upsertActivity(supabase, {
      event,
      verb: 'community.join.requested',
      subjectIdentityId: (event.payload as any)?.identity_id ?? event.actor_id,
      visibility: 'PRIVATE',
    })
  })

  // Invitations
  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_INVITATION_CREATED, async (event, supabase) => {
    await upsertActivity(supabase, {
      event,
      verb: 'community.invitation.created',
      subjectIdentityId: (event.payload as any)?.invited_identity_id ?? null,
      visibility: 'PRIVATE',
    })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_INVITATION_ACCEPTED, async (event, supabase) => {
    await upsertActivity(supabase, {
      event,
      verb: 'community.invitation.accepted',
      subjectIdentityId: (event.payload as any)?.identity_id ?? event.actor_id,
      visibility: 'MEMBERS',
    })
  })

  // Content / operations events (light — full detail in Phase 10)
  registerEventHandler(KERNEL_EVENT_TYPES.ANNOUNCEMENT_PUBLISHED, async (event, supabase) => {
    await upsertActivity(supabase, { event, verb: 'community.announcement.published', visibility: 'MEMBERS' })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.POST_PUBLISHED, async (event, supabase) => {
    await upsertActivity(supabase, { event, verb: 'community.post.published', visibility: 'MEMBERS' })
  })

  // Announcement fanout consumer
  registerEventHandler(KERNEL_EVENT_TYPES.ANNOUNCEMENT_PUBLISHED, async (event, supabase) => {
    const { fanoutAnnouncement } = await import('./service.announcements')
    await fanoutAnnouncement(supabase, event.aggregate_id)
  })
}