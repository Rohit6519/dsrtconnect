import { SupabaseClient } from '@supabase/supabase-js'
import { MembershipService } from './MembershipService'

export class InvitationService {
  private membershipService: MembershipService

  constructor(private supabase: SupabaseClient) {
    this.membershipService = new MembershipService(supabase)
  }

  /**
   * Holds an invitation. Keeps it active but signals the user needs time/info.
   */
  async holdInvitation(invitationId: string, actorId: string, message?: string) {
    const { data: inv } = await this.supabase.from('venture_team_invitations').select('status, invited_user_id').eq('id', invitationId).single()
    
    if (!inv || inv.invited_user_id !== actorId) throw new Error('Unauthorized')
    if (inv.status !== 'sent' && inv.status !== 'viewed') throw new Error('Invalid state transition')

    const { data, error } = await this.supabase
      .from('venture_team_invitations')
      .update({ 
        status: 'held', 
        held_at: new Date().toISOString(),
        hold_message: message || null
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Rejects an invitation explicitly.
   */
  async rejectInvitation(invitationId: string, actorId: string, message?: string) {
    const { data: inv } = await this.supabase.from('venture_team_invitations').select('status, invited_user_id').eq('id', invitationId).single()
    
    if (!inv || inv.invited_user_id !== actorId) throw new Error('Unauthorized')
    if (['accepted', 'rejected', 'cancelled', 'expired'].includes(inv.status)) {
      throw new Error('Invalid state transition')
    }

    const { data, error } = await this.supabase
      .from('venture_team_invitations')
      .update({ 
        status: 'rejected', 
        responded_at: new Date().toISOString(),
        reject_message: message || null
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Accepts an invitation and hands off to MembershipService for transactional activation.
   */
  async acceptInvitation(invitationId: string, actorId: string) {
    const { data: inv } = await this.supabase.from('venture_team_invitations').select('status, invited_user_id, expires_at').eq('id', invitationId).single()
    
    if (!inv || inv.invited_user_id !== actorId) throw new Error('Unauthorized')
    
    if (new Date(inv.expires_at) < new Date()) {
      await this.supabase.from('venture_team_invitations').update({ status: 'expired' }).eq('id', invitationId)
      throw new Error('This invitation has expired.')
    }

    // Handoff to Membership Service to enforce strict creation transaction
    return await this.membershipService.activateMembership(invitationId, actorId)
  }

  /**
   * Revokes an invitation (Owner action).
   */
  async revokeInvitation(invitationId: string, ventureId: string) {
    const { data, error } = await this.supabase
      .from('venture_team_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)
      .eq('venture_id', ventureId)
      .in('status', ['draft', 'sent', 'viewed', 'held'])
      .select()
      .single()

    if (error) throw new Error('Could not revoke invitation')
    return data
  }
}