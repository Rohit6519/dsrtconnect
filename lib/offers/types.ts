export type OfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'revoked'

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'freelance'
  | 'cofounder'
  | 'internship'

export type CompensationPeriod = 'hourly' | 'monthly' | 'annual' | 'fixed' | 'milestone'

export interface Offer {
  id: string
  application_id: string
  opportunity_id: string
  candidate_id: string
  issued_by: string
  status: OfferStatus
  title: string
  role_title: string
  employment_type: EmploymentType
  compensation_amount: number
  compensation_currency: string
  compensation_period: CompensationPeriod
  equity_percentage: number | null
  equity_vesting_terms: string | null
  start_date: string
  expiration_date: string | null
  terms_markdown: string
  special_conditions: string | null
  candidate_signature_name: string | null
  candidate_signed_at: string | null
  candidate_ip: string | null
  candidate_user_agent: string | null
  decline_reason: string | null
  decline_note: string | null
  declined_at: string | null
  sent_at: string | null
  viewed_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateOfferInput {
  application_id: string
  opportunity_id: string
  title: string
  role_title: string
  employment_type: EmploymentType
  compensation_amount: number
  compensation_currency: string
  compensation_period: CompensationPeriod
  equity_percentage?: number | null
  equity_vesting_terms?: string | null
  start_date: string
  expiration_date?: string | null
  terms_markdown: string
  special_conditions?: string | null
}