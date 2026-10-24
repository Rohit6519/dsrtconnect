// ============================================================
// lib/recruitment/service.reviewers.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/kernel'

export async function addReviewerNote(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    application_id: string
    body: string
    visibility?: 'PRIVATE' | 'TEAM' | 'SYSTEM'
    score?: number
  },
  requestId?: string
) {
  if (!input.body?.trim()) throw new ValidationError([{ field: 'body', message: 'Body required' }])

  const { data: app } = await supabase
    .from('looking_for_applications')
    .select('id, community_id')
    .eq('id', input.application_id)
    .maybeSingle()

  if (!app) throw new NotFoundError('Application', input.application_id)

  const { data: note, error } = await supabase
    .from('recruitment_reviewer_notes')
    .insert({
      application_id: input.application_id,
      author_id: actorId,
      body: input.body.trim(),
      visibility: input.visibility || 'TEAM',
      score: input.score || null,
    })
    .select('*')
    .single()

  if (error || !note) throw new Error(`Note insert failed: ${error?.message}`)

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.note.added',
    entityType: 'recruitment_reviewer_note',
    entityId: note.id,
    scopeType: 'community',
    scopeId: app.community_id,
    requestId,
  })

  return note
}

export async function assignReviewer(
  supabase: SupabaseClient,
  actorId: string,
  applicationId: string,
  reviewerId: string,
  requestId?: string
) {
  await supabase.from('recruitment_reviewers').upsert({
    application_id: applicationId,
    reviewer_id: reviewerId,
    assigned_by: actorId
  })

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.reviewer.assigned',
    entityType: 'looking_for_application',
    entityId: applicationId,
    requestId,
  })
  
  return { assigned: true }
}

export async function removeReviewer(
  supabase: SupabaseClient,
  actorId: string,
  applicationId: string,
  reviewerId: string,
  requestId?: string
) {
  await supabase.from('recruitment_reviewers').delete()
    .eq('application_id', applicationId)
    .eq('reviewer_id', reviewerId)

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.reviewer.removed',
    entityType: 'looking_for_application',
    entityId: applicationId,
    requestId,
  })
  
  return { removed: true }
}

export async function deleteReviewerNote(
  supabase: SupabaseClient,
  actorId: string,
  noteId: string,
  requestId?: string
) {
  const { data: note } = await supabase.from('recruitment_reviewer_notes').select('author_id').eq('id', noteId).maybeSingle()
  if (!note) throw new NotFoundError('Note', noteId)
  if (note.author_id !== actorId) throw new ForbiddenError('Not your note')

  await supabase.from('recruitment_reviewer_notes').delete().eq('id', noteId)

  await writeAudit(supabase, {
    actorId,
    action: 'recruitment.note.deleted',
    entityType: 'recruitment_reviewer_note',
    entityId: noteId,
    requestId,
  })

  return { deleted: true }
}