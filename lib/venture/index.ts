import { createClient } from '@/lib/supabase/server'
import { EligibilityEngine } from './EligibilityEngine'
import { InvitationService } from './InvitationService'
import { MembershipService } from './MembershipService'
import { MailBridgeService } from './MailBridgeService'

export async function getVentureServices() {
  const supabase = await createClient()
  return {
    supabase,
    eligibility: new EligibilityEngine(supabase),
    invitations: new InvitationService(supabase),
    memberships: new MembershipService(supabase),
    mailBridge: new MailBridgeService(supabase),
  }
}

export { EligibilityEngine } from './EligibilityEngine'
export { InvitationService } from './InvitationService'
export { MembershipService } from './MembershipService'
export { MailBridgeService } from './MailBridgeService'