// ============================================================
// lib/looking-for/service.applications.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  NotFoundError,
  ForbiddenError,
  StateConflictError,
  KERNEL_EVENT_TYPES,
} from '@/lib/kernel'
import { SubmitApplicationInput } from './types'
import { startWorkflowRun } from '@/lib/operations/service.workflows'
import { addItemToBoard } from '@/lib/operations/service.buckets'

export async function submitListingApplication(
  supabase: SupabaseClient,
  actorId: string,
  input: SubmitApplicationInput,
  requestId?: string
) {
  const { data: listing } = await supabase
    .from('looking_for_listings')
    .select('*, communities(name, slug)')
    .eq('id', input.listing_id)
    .maybeSingle()

  if (!listing) throw new NotFoundError('Listing', input.listing_id)
  if (listing.status !== 'PUBLISHED') throw new StateConflictError('Listing is not accepting applications')
  if (listing.owner_identity_id === actorId) throw new ForbiddenError('Cannot apply to your own listing')

  const { data: existing } = await supabase
    .from('looking_for_applications')
    .select('id, status')
    .eq('listing_id', input.listing_id)
    .eq('applicant_id', actorId)
    .maybeSingle()

  if (existing && existing.status !== 'WITHDRAWN') {
    throw new StateConflictError('You have already applied to this listing')
  }

  const { data: app, error } = await supabase
    .from('looking_for_applications')
    .insert({
      listing_id: input.listing_id,
      community_id: listing.community_id,
      applicant_id: actorId,
      cover_note: input.cover_note || null,
      form_submission_id: input.form_submission_id || null,
      stage: 'NEW',
      status: 'SUBMITTED',
    })
    .select('*')
    .single()

  if (error || !app) throw new Error(`Application failed: ${error?.message}`)

  let runId: string | null = null
  if (listing.workflow_id) {
    try {
      const run = await startWorkflowRun(supabase, actorId, {
        workflow_id: listing.workflow_id,
        target_entity_type: 'looking_for_application',
        target_entity_id: app.id,
        subject_identity_id: actorId,
      }, requestId)
      runId = run.run_id
    } catch (e: any) {
      console.warn('[looking_for:workflow_run_start_failed]', e?.message)
    }
  }

  if (listing.board_id) {
    try {
      await addItemToBoard(supabase, actorId, {
        board_id: listing.board_id,
        target_entity_type: 'looking_for_application',
        target_entity_id: app.id,
        workflow_run_id: runId || undefined,
      })
    } catch (e: any) {
      console.warn('[looking_for:add_to_board_failed]', e?.message)
    }
  }

  await createNotification(supabase, {
    recipientId: listing.owner_identity_id,
    type: 'looking_for_application_received',
    priority: 'HIGH',
    entityType: 'looking_for_application',
    entityId: app.id,
    title: `New application for ${listing.title}`,
    body: input.cover_note ? input.cover_note.slice(0, 150) : 'A candidate applied to your listing.',
    actionUrl: `/community/${listing.communities?.slug}/studio/applications`,
    fromUserId: actorId,
    icon: 'user',
  })

  await writeAudit(supabase, {
    actorId,
    action: 'looking_for.application.submitted',
    entityType: 'looking_for_application',
    entityId: app.id,
    scopeType: 'community',
    scopeId: listing.community_id,
    requestId,
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.LOOKING_FOR_APPLICATION_SUBMITTED,
    aggregateType: 'looking_for_application',
    aggregateId: app.id,
    actorId,
    payload: { listing_id: input.listing_id, application_id: app.id },
  })
  const eventId = await writeOutbox(supabase, event)

  return { application_id: app.id, event_id: eventId }
}

export async function listApplications(supabase: SupabaseClient, actorId: string, listingId: string, filters: any) {
  let query = supabase.from('looking_for_applications').select('*').eq('listing_id', listingId).limit(50)
  if (filters.stage) query = query.eq('stage', filters.stage)
  const { data } = await query
  return { items: data || [] }
}

export async function getApplicationDetail(supabase: SupabaseClient, actorId: string, applicationId: string) {
  const { data: app } = await supabase.from('looking_for_applications').select('*').eq('id', applicationId).maybeSingle()
  if (!app) throw new NotFoundError('Application', applicationId)
  return { application: app }
}

export async function withdrawApplication(supabase: SupabaseClient, actorId: string, applicationId: string, requestId?: string) {
  const { data: app } = await supabase.from('looking_for_applications').select('id, applicant_id').eq('id', applicationId).maybeSingle()
  if (!app) throw new NotFoundError('Application', applicationId)
  if (app.applicant_id !== actorId) throw new ForbiddenError('Not your application')

  await supabase.from('looking_for_applications').update({ status: 'WITHDRAWN' }).eq('id', applicationId)

  await writeAudit(supabase, {
    actorId,
    action: 'looking_for.application.withdrawn',
    entityType: 'looking_for_application',
    entityId: applicationId,
    requestId,
  })
  return { withdrawn: true }
}