// ============================================================
// lib/recruitment/service.interviews.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  createNotification,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/kernel'

export async function scheduleInterview(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    application_id: string
    title: string
    scheduled_at: string
    meeting_url?: string
    participant_ids?: string[]
  },
  requestId?: string
) {
  if (!input.title?.trim()) throw new ValidationError([{ field: 'title', message: 'Title required' }])
  if (!input.scheduled_at) throw new ValidationError([{ field: 'scheduled_at', message: 'Schedule required' }])

  const { data: app } = await supabase
    .from('looking_for_applications')
    .select('id, community_id, applicant_id')
    .eq('id', input.application_id)
    .maybeSingle()

  if (!app) throw new NotFoundError('Application', input.application_id)

  const { data: interview, error } = await supabase
    .from('interviews')
    .insert({
      application_id: input.application_id,
      opportunity_id: app.community_id,
      title: input.title.trim(),
      scheduled_at: input.scheduled_at,
      meeting_url: input.meeting_url || null,
      status: 'SCHEDULED',
    })
    .select('*')
    .single()

  if (error || !interview) throw new Error(`Interview failed: ${error?.message}`)

  const participants = Array.from(new Set([...(input.participant_ids || []), actorId]))
  if (participants.length > 0) {
    const rows = participants.map(uid => ({
      interview_id: interview.id,
      user_id: uid,
      role: uid === actorId ? 'hiring_manager' : 'interviewer',
    }))
    await supabase.from('interview_participants').insert(rows)
  }

  await createNotification(supabase, {
    recipientId: app.applicant_id,
    type: 'recruitment_interview_scheduled',
    priority: 'HIGH',
    entityType: 'interview',
    entityId: interview.id,
    title: `Interview scheduled: ${interview.title}`,
    body: `Scheduled for ${new Date(input.scheduled_at).toLocaleString()}`,
    actionUrl: `/interviews/${interview.id}`,
    fromUserId: actorId,
    icon: 'calendar',
  })

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.interview.scheduled',
    entityType: 'interview',
    entityId: interview.id,
    requestId,
  })

  return interview
}

export async function cancelInterview(
  supabase: SupabaseClient,
  actorId: string,
  interviewId: string,
  requestId?: string
) {
  const { data: interview } = await supabase.from('interviews').select('id').eq('id', interviewId).maybeSingle()
  if (!interview) throw new NotFoundError('Interview', interviewId)

  await supabase.from('interviews').update({ status: 'CANCELLED' }).eq('id', interviewId)

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.interview.cancelled',
    entityType: 'interview',
    entityId: interviewId,
    requestId,
  })

  return { cancelled: true }
}

export async function respondToInterview(
  supabase: SupabaseClient,
  actorId: string,
  interviewId: string,
  response: 'ACCEPTED' | 'DECLINED',
  requestId?: string
) {
  const { data: participant } = await supabase
    .from('interview_participants')
    .select('id')
    .eq('interview_id', interviewId)
    .eq('user_id', actorId)
    .maybeSingle()

  if (!participant) throw new ForbiddenError('You are not a participant in this interview')

  await supabase
    .from('interview_participants')
    .update({ response_status: response })
    .eq('id', participant.id)

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.interview.responded',
    entityType: 'interview',
    entityId: interviewId,
    requestId,
    metadata: { response },
  })

  return { responded: true }
}