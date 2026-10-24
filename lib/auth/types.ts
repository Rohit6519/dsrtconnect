export type AccountState =
  | 'REGISTERED'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'USERNAME_REQUIRED'
  | 'ONBOARDING_REQUIRED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'LOCKED'
  | 'DEACTIVATED'
  | 'DELETION_PENDING'
  | 'DELETED'

export type AuthClientState =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED_UNVERIFIED'
  | 'USERNAME_REQUIRED'
  | 'ONBOARDING_REQUIRED'
  | 'MFA_REQUIRED'
  | 'AUTHENTICATED'
  | 'SUSPENDED'
  | 'LOCKED'

export interface DsrtIdentity {
  id: string
  email: string
  username: string | null
  normalized_username: string | null
  full_name: string | null
  account_state: AccountState
  mailbox_state: 'UNPROVISIONED' | 'PROVISIONING' | 'PROVISIONED' | string
  onboarding_complete: boolean
  dob: string | null
  email_verified_at: string | null
  created_at: string
}