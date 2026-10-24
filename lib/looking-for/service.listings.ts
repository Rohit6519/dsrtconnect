// ============================================================
// lib/looking-for/service.listings.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  KERNEL_EVENT_TYPES,
} from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from '@/lib/community/permissions'
import { CreateListingInput } from './types'
import { ensureRecruitmentWorkflowTemplate } from './workflow-template'

export async function createListing(
  supabase: SupabaseClient,
  actorId: string,
  input: CreateListingInput,
  requestId?: string
) {
  if (!input.title?.trim()) throw new ValidationError([{ field: 'title', message: 'Title required' }])

  const canCreate = await hasCommunityPermission(
    supabase,
    actorId,
    input.community_id,
    COMMUNITY_PERMISSIONS.LOOKING_FOR_CREATE
  )
  if (!canCreate) throw new ForbiddenError('Permission denied to create listings in this community')

  const publicId = 'LF-' + Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data: listing, error } = await supabase
    .from('looking_for_listings')
    .insert({
      community_id: input.community_id,
      owner_identity_id: actorId,
      public_id: publicId,
      slug: input.slug.toLowerCase().trim(),
      title: input.title.trim(),
      role: input.role || null,
      commitment: input.commitment || 'FULL_TIME',
      location_type: input.location_type || 'REMOTE',
      location_text: input.location_text || null,
      description: input.description || null,
      requirements: input.requirements || [],
      skills: input.skills || [],
      form_id: input.form_id || null,
      status: 'DRAFT',
    })
    .select('*')
    .single()

  if (error || !listing) throw new Error(`Listing creation failed: ${error?.message}`)

  await writeAudit(supabase, {
    actorId,
    action: 'looking_for.listing.created',
    entityType: 'looking_for_listing',
    entityId: listing.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
  })

  return { listing }
}

export async function publishListing(
  supabase: SupabaseClient,
  actorId: string,
  listingId: string,
  requestId?: string
) {
  const { data: listing } = await supabase
    .from('looking_for_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()

  if (!listing) throw new NotFoundError('Listing', listingId)
  if (listing.owner_identity_id !== actorId) throw new ForbiddenError('Not owner of listing')

  let wfId = listing.workflow_id
  let boardId = listing.board_id

  if (!wfId || !boardId) {
    const provisioned = await ensureRecruitmentWorkflowTemplate(
      supabase,
      actorId,
      listing.community_id,
      listing.title
    )
    wfId = provisioned.workflow_id
    boardId = provisioned.board_id
  }

  const { data: updated } = await supabase
    .from('looking_for_listings')
    .update({
      status: 'PUBLISHED',
      workflow_id: wfId,
      board_id: boardId,
      published_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('*')
    .single()

  await writeAudit(supabase, {
    actorId,
    action: 'looking_for.listing.published',
    entityType: 'looking_for_listing',
    entityId: listingId,
    scopeType: 'community',
    scopeId: listing.community_id,
    requestId,
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.LOOKING_FOR_PUBLISHED,
    aggregateType: 'looking_for_listing',
    aggregateId: listingId,
    actorId,
    payload: { listing_id: listingId, community_id: listing.community_id, title: listing.title },
  })
  const eventId = await writeOutbox(supabase, event)

  return { listing: updated, event_id: eventId }
}

export async function closeListing(
  supabase: SupabaseClient,
  actorId: string,
  listingId: string,
  requestId?: string
) {
  const { data: listing } = await supabase
    .from('looking_for_listings')
    .select('id, community_id, owner_identity_id')
    .eq('id', listingId)
    .maybeSingle()

  if (!listing) throw new NotFoundError('Listing', listingId)
  
  const canManage = await hasCommunityPermission(
    supabase,
    actorId,
    listing.community_id,
    COMMUNITY_PERMISSIONS.LOOKING_FOR_MANAGE
  )
  if (!canManage && listing.owner_identity_id !== actorId) {
    throw new ForbiddenError('Permission denied')
  }

  await supabase
    .from('looking_for_listings')
    .update({ status: 'CLOSED' })
    .eq('id', listingId)

  await writeAudit(supabase, {
    actorId,
    action: 'looking_for.listing.closed',
    entityType: 'looking_for_listing',
    entityId: listingId,
    scopeType: 'community',
    scopeId: listing.community_id,
    requestId,
  })

  return { listing_id: listingId, status: 'CLOSED' }
}