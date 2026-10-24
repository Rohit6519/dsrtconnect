import { SupabaseClient } from '@supabase/supabase-js'
import { registerEventHandler, KernelEventEnvelope, KERNEL_EVENT_TYPES } from '@/lib/kernel'

async function projectActivity(
  supabase: SupabaseClient,
  event: KernelEventEnvelope,
  verb: string,
  objectType: string,
  opts?: {
    visibility?: string
    targetType?: string
    targetId?: string
    communityId?: string
    reasonCodes?: string[]
  }
) {
  const payload: any = event.payload || {}
  const communityId = opts?.communityId || payload.community_id || null

  await supabase.from('ecosystem_activity').upsert(
    {
      actor_id: event.actor_id,
      verb,
      object_type: objectType,
      object_id: event.aggregate_id,
      target_type: opts?.targetType || null,
      target_id: opts?.targetId || null,
      community_id: communityId,
      visibility: opts?.visibility || 'PUBLIC',
      reason_codes: opts?.reasonCodes || null,
      metadata: payload,
      event_id: event.event_id,
      occurred_at: event.occurred_at,
    },
    { onConflict: 'event_id' }
  )
}

let registered = false

export function registerEcosystemActivityConsumers() {
  if (registered) return
  registered = true

  // Community events
  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_CREATED, async (e, s) => {
    await projectActivity(s, e, 'community.created', 'community', { visibility: 'PUBLIC' })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.COMMUNITY_MEMBER_JOINED, async (e, s) => {
    await projectActivity(s, e, 'community.member.joined', 'community_membership', { visibility: 'PUBLIC' })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.POST_PUBLISHED, async (e, s) => {
    await projectActivity(s, e, 'post.published', 'community_post', { visibility: 'COMMUNITY' })
  })

  registerEventHandler(KERNEL_EVENT_TYPES.ANNOUNCEMENT_PUBLISHED, async (e, s) => {
    await projectActivity(s, e, 'announcement.published', 'community_announcement', { visibility: 'COMMUNITY' })
  })

  // Event events
  registerEventHandler('event.published', async (e, s) => {
    await projectActivity(s, e, 'event.published', 'event', { visibility: 'PUBLIC' })
  })

  registerEventHandler('event.registration.confirmed', async (e, s) => {
    await projectActivity(s, e, 'event.registered', 'event_registration', { visibility: 'COMMUNITY' })
  })

  registerEventHandler('event.attendance.recorded', async (e, s) => {
    await projectActivity(s, e, 'event.attended', 'event_attendance', { visibility: 'COMMUNITY' })
  })

  // Looking For events
  registerEventHandler('looking_for.listing.published', async (e, s) => {
    await projectActivity(s, e, 'looking_for.published', 'looking_for_listing', { visibility: 'PUBLIC' })
  })

  registerEventHandler('looking_for.application.submitted', async (e, s) => {
    await projectActivity(s, e, 'looking_for.applied', 'looking_for_application', { visibility: 'PRIVATE' })
  })

  registerEventHandler('recruitment.decision.hired', async (e, s) => {
    await projectActivity(s, e, 'recruitment.hired', 'recruitment_decision', { visibility: 'COMMUNITY' })
  })

  // Moderation
  registerEventHandler('community.report.submitted', async (e, s) => {
    await projectActivity(s, e, 'moderation.reported', 'community_report', { visibility: 'PRIVATE' })
  })
}