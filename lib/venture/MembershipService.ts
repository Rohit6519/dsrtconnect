import { SupabaseClient } from '@supabase/supabase-js'
import { EligibilityEngine } from './EligibilityEngine'

export class MembershipService {
  private eligibilityEngine: EligibilityEngine

  constructor(private supabase: SupabaseClient) {
    this.eligibilityEngine = new EligibilityEngine(supabase)
  }

  /**
   * TRANSACTIONAL ACTIVATION: Converts an accepted invitation into an active membership.
   * Updates position capacity and handles auditing automatically.
   */
  async activateMembership(invitationId: string, actorId: string): Promise<any> {
    // 1. Fetch Invitation
    const { data: inv, error: invErr } = await this.supabase
      .from('venture_team_invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (invErr || !inv) throw new Error('Invitation not found.')
    if (inv.status !== 'sent' && inv.status !== 'viewed' && inv.status !== 'held') {
      throw new Error(`Cannot activate membership. Invitation status is ${inv.status}.`)
    }

    // 2. Final Eligibility Re-check (CRITICAL RULE #23)
    const eligibility = await this.eligibilityEngine.evaluate(
      inv.venture_id,
      inv.invited_user_id,
      inv.position_id
    )

    if (!eligibility.eligible) {
      throw new Error(`Eligibility failed: ${eligibility.hard_failures.join(' ')}`)
    }

    // 3. TRANSACTION START (using RPC for atomicity if needed, but doing sequential failsafe here)
    // Mark invitation as accepted
    await this.supabase
      .from('venture_team_invitations')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', inv.id)

    // Create Membership
    const { data: membership, error: memErr } = await this.supabase
      .from('venture_team_memberships')
      .insert({
        venture_id: inv.venture_id,
        user_id: inv.invited_user_id,
        position_id: inv.position_id,
        role_id: inv.role_id,
        role_title: inv.proposed_role_title,
        permissions: inv.permissions_snapshot,
        source: inv.source,
        status: 'active',
        invitation_id: inv.id,
        invited_by: inv.invited_by_user_id,
        activated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memErr) {
      // Compensating transaction (rollback invitation state)
      await this.supabase.from('venture_team_invitations').update({ status: inv.status }).eq('id', inv.id)
      throw new Error('Failed to create membership record.')
    }

    // Update Position Occupancy
    if (inv.position_id) {
      await this.supabase.rpc('fn_sync_position_occupancy', { p_position_id: inv.position_id })
    }

    // Write Canonical Activity Audit
    await this.supabase.from('venture_team_activity').insert({
      venture_id: inv.venture_id,
      actor_id: actorId,
      action: 'membership.activated',
      target_type: 'membership',
      target_id: membership.id,
      new_state: membership,
      metadata: { source_invitation: inv.id }
    })

    return membership
  }

  async suspendMembership(membershipId: string, actorId: string, reason?: string) {
    const { data, error } = await this.supabase
      .from('venture_team_memberships')
      .update({ 
        status: 'suspended', 
        suspended_at: new Date().toISOString(),
        suspended_by: actorId,
        removed_reason: reason 
      })
      .eq('id', membershipId)
      .select()
      .single()

    if (error) throw error

    await this.supabase.rpc('fn_sync_position_occupancy', { p_position_id: data.position_id })
    return data
  }
}