// ============================================================
// lib/community/service.polls.ts
// Atomic voting via RPC.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { writeAudit, writeOutbox, createKernelEvent, KERNEL_EVENT_TYPES, NotFoundError, ForbiddenError, StateConflictError } from '@/lib/kernel'

export async function castPollVote(
  supabase: SupabaseClient,
  actorId: string,
  pollId: string,
  optionId: string,
  requestId?: string
): Promise<{ action: string; event_id: string }> {
  const { data: poll } = await supabase
    .from('community_polls_v2')
    .select('id, community_id, status')
    .eq('id', pollId)
    .maybeSingle()
  if (!poll) throw new NotFoundError('Poll', pollId)
  if (poll.status !== 'OPEN') throw new StateConflictError('Poll is not open')

  // Must be active member
  const { data: membership } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', poll.community_id)
    .eq('identity_id', actorId)
    .maybeSingle()
  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Only active members can vote')
  }

  const { data, error } = await supabase.rpc('rpc_cast_poll_vote', {
    p_poll_id: pollId,
    p_option_id: optionId,
    p_identity_id: actorId,
  })
  if (error) throw new Error(error.message)

  await writeAudit(supabase, {
    actorId,
    action: 'community.poll.voted',
    entityType: 'community_poll',
    entityId: pollId,
    scopeType: 'community',
    scopeId: poll.community_id,
    requestId,
    metadata: { option_id: optionId, action: (data as any)?.action },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.POLL_VOTED,
    aggregateType: 'community_poll',
    aggregateId: pollId,
    actorId,
    payload: { community_id: poll.community_id, poll_id: pollId, option_id: optionId, action: (data as any)?.action },
  })
  const eventId = await writeOutbox(supabase, event)

  return { action: (data as any)?.action || 'unknown', event_id: eventId }
}

export async function closePoll(
  supabase: SupabaseClient,
  actorId: string,
  pollId: string,
  requestId?: string
) {
  const { data: poll } = await supabase
    .from('community_polls_v2')
    .select('id, community_id, author_identity_id, status')
    .eq('id', pollId)
    .maybeSingle()
  if (!poll) throw new NotFoundError('Poll', pollId)
  if (poll.status !== 'OPEN') throw new StateConflictError('Poll not open')
  if (poll.author_identity_id !== actorId) throw new ForbiddenError('Only author can close')

  await supabase
    .from('community_polls_v2')
    .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
    .eq('id', pollId)

  await writeAudit(supabase, {
    actorId,
    action: 'community.poll.closed',
    entityType: 'community_poll',
    entityId: pollId,
    scopeType: 'community',
    scopeId: poll.community_id,
    requestId,
  })
}