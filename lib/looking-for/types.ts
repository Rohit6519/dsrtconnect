// ============================================================
// lib/looking-for/types.ts
// ============================================================

export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'
export type CommitmentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'ADVISORY' | 'COFOUNDER'
export type LocationType = 'REMOTE' | 'HYBRID' | 'ONSITE'

export interface CreateListingInput {
  community_id: string
  slug: string
  title: string
  role?: string
  commitment?: CommitmentType
  location_type?: LocationType
  location_text?: string
  description?: string
  requirements?: string[]
  skills?: string[]
  form_id?: string
}

export interface SubmitApplicationInput {
  listing_id: string
  cover_note?: string
  form_submission_id?: string
}