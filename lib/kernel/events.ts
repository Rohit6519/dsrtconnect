// ============================================================
// lib/kernel/events.ts
// Event Envelope, Registry, and Idempotent Event Consumer.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface KernelEventEnvelope<T = Record<string, unknown>> {
  event_id: string
  event_type: string
  event_version: number
  aggregate_type: string
  aggregate_id: string
  actor_id: string | null
  correlation_id: string | null
  causation_id: string | null
  payload: T
  occurred_at: string
}

export const KERNEL_EVENT_TYPES = {
  // Community Core
  COMMUNITY_CREATED: 'community.created',
  COMMUNITY_UPDATED: 'community.updated',
  COMMUNITY_PUBLISHED: 'community.published',
  COMMUNITY_ARCHIVED: 'community.archived',
  COMMUNITY_JOIN_REQUESTED: 'community.join.requested',
  COMMUNITY_JOIN_APPROVED: 'community.join.approved',
  COMMUNITY_MEMBER_JOINED: 'community.member.joined',
  COMMUNITY_MEMBER_LEFT: 'community.member.left',
  COMMUNITY_MEMBER_SUSPENDED: 'community.member.suspended',
  COMMUNITY_MEMBER_BANNED: 'community.member.banned',
  COMMUNITY_ROLE_ASSIGNED: 'community.role.assigned',
  COMMUNITY_OWNERSHIP_TRANSFERRED: 'community.ownership.transferred',
  COMMUNITY_INVITATION_CREATED: 'community.invitation.created',
  COMMUNITY_INVITATION_ACCEPTED: 'community.invitation.accepted',
  COMMUNITY_INVITATION_DECLINED: 'community.invitation.declined',
  COMMUNITY_INVITATION_REVOKED: 'community.invitation.revoked',
  COMMUNITY_APPLICATION_SUBMITTED: 'community.application.submitted',
  COMMUNITY_APPLICATION_APPROVED: 'community.application.approved',
  COMMUNITY_APPLICATION_REJECTED: 'community.application.rejected',
  COMMUNITY_FOLLOWED: 'community.followed',
  COMMUNITY_UNFOLLOWED: 'community.unfollowed',

  // Content
  POST_CREATED: 'community.post.created',
  POST_PUBLISHED: 'community.post.published',
  POST_REMOVED: 'community.post.removed',
  POST_PINNED: 'community.post.pinned',
  POST_UNPINNED: 'community.post.unpinned',
  ANNOUNCEMENT_PUBLISHED: 'community.announcement.published',
  POLL_VOTED: 'community.poll.voted',
  POLL_CLOSED: 'community.poll.closed',
  COMMENT_CREATED: 'community.comment.created',
  COMMENT_DELETED: 'community.comment.deleted',
  REACTION_TOGGLED: 'community.reaction.toggled',

  // Moderation
  REPORT_SUBMITTED: 'community.report.submitted',
  MODERATION_ACTION_TAKEN: 'community.moderation.action_taken',
  MODERATION_CASE_ASSIGNED: 'community.moderation.case_assigned',
  MODERATION_CASE_DISMISSED: 'community.moderation.case_dismissed',
  APPEAL_SUBMITTED: 'community.appeal.submitted',
  APPEAL_UPHELD: 'community.appeal.upheld',
  APPEAL_OVERTURNED: 'community.appeal.overturned',

  // Operations
  FORM_SUBMITTED: 'operations.form.submitted',
  FORM_PUBLISHED: 'operations.form.published',
  WORKFLOW_PUBLISHED: 'operations.workflow.published',
  WORKFLOW_TRANSITIONED: 'operations.workflow.transitioned',
  BUCKET_ITEM_MOVED: 'operations.bucket.item_moved',

  // Events (Phase 13)
  EVENT_PUBLISHED: 'event.published',
  EVENT_CANCELLED: 'event.cancelled',
  EVENT_REGISTRATION_CONFIRMED: 'event.registration.confirmed',
  EVENT_REGISTRATION_WAITLISTED: 'event.registration.waitlisted',
  EVENT_REGISTRATION_CANCELLED: 'event.registration.cancelled',
  EVENT_WAITLIST_OFFERED: 'event.waitlist.offered',
  EVENT_ATTENDANCE_RECORDED: 'event.attendance.recorded',

  // Recruitment (Phase 14)
  LOOKING_FOR_PUBLISHED: 'looking_for.listing.published',
  LOOKING_FOR_APPLICATION_SUBMITTED: 'looking_for.application.submitted',
  RECRUITMENT_DECISION_HIRED: 'recruitment.decision.hired',
  RECRUITMENT_DECISION_REJECTED: 'recruitment.decision.rejected',
  RECRUITMENT_INTERVIEW_FEEDBACK_SUBMITTED: 'recruitment.interview.feedback.submitted',

  // Platform Kernel
  NOTIFICATION_CREATED: 'kernel.notification.created',
  FILE_UPLOADED: 'kernel.file.uploaded',
  AUDIT_LOGGED: 'kernel.audit.logged',
} as const

export type KnownEventType = typeof KERNEL_EVENT_TYPES[keyof typeof KERNEL_EVENT_TYPES] | string

function cryptoRandomId(): string {
  try {
    // Node 19+ / modern browsers
    // @ts-ignore
    return crypto.randomUUID()
  } catch {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}

export function createKernelEvent<T extends Record<string, unknown>>(params: {
  eventType: KnownEventType
  aggregateType: string
  aggregateId: string
  actorId?: string | null
  payload: T
  eventVersion?: number
  correlationId?: string | null
  causationId?: string | null
}): KernelEventEnvelope<T> {
  const eventId = `evt_${Date.now().toString(36)}_${cryptoRandomId().replace(/-/g, '').slice(0, 12)}`
  return {
    event_id: eventId,
    event_type: params.eventType,
    event_version: params.eventVersion ?? 1,
    aggregate_type: params.aggregateType,
    aggregate_id: params.aggregateId,
    actor_id: params.actorId ?? null,
    correlation_id: params.correlationId ?? null,
    causation_id: params.causationId ?? null,
    payload: params.payload,
    occurred_at: new Date().toISOString(),
  }
}

/**
 * Idempotency guard for event consumers.
 * Guarantees that a consumer processes a specific event_id EXACTLY ONCE.
 */
export async function consumeIdempotent(
  supabase: SupabaseClient,
  consumerName: string,
  eventId: string,
  handler: () => Promise<void>
): Promise<{ processed: boolean; skipped: boolean }> {
  const { error } = await supabase
    .from('kernel_event_consumptions')
    .insert({
      consumer_name: consumerName,
      event_id: eventId,
      processed_at: new Date().toISOString(),
    })

  if (error) {
    if (error.code === '23505') {
      return { processed: false, skipped: true }
    }
    throw error
  }

  await handler()
  return { processed: true, skipped: false }
}