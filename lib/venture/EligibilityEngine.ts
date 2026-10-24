import { SupabaseClient } from '@supabase/supabase-js'

export interface EligibilityResult {
  eligible: boolean
  hard_failures: string[]
  warnings: string[]
  evaluated_at: string
}

export class EligibilityEngine {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Evaluates if a user can be invited or can activate their membership.
   */
  async evaluate(
    ventureId: string,
    userId: string,
    positionId?: string
  ): Promise<EligibilityResult> {
    const failures: string[] = []
    const warnings: string[] = []

    // 1. Identity Check
    const { data: user } = await this.supabase
      .from('users')
      .select('id, status')
      .eq('id', userId)
      .single()

    if (!user) failures.push('User does not exist.')
    else if (user.status === 'suspended') failures.push('User account is restricted.')

    // 2. Venture Check
    const { data: venture } = await this.supabase
      .from('ventures')
      .select('id, status')
      .eq('id', ventureId)
      .single()

    if (!venture) failures.push('Venture does not exist.')
    else if (venture.status === 'archived') failures.push('Venture is archived.')

    // 3. Conflict Check (Already a member?)
    const { data: existingMembership } = await this.supabase
      .from('venture_team_memberships')
      .select('id, status')
      .eq('venture_id', ventureId)
      .eq('user_id', userId)
      .in('status', ['active', 'suspended'])
      .maybeSingle()

    if (existingMembership) {
      failures.push('User is already an active or suspended member of this venture.')
    }

    // 4. Position Capacity Check (if targeting a specific position)
    if (positionId) {
      const { data: position } = await this.supabase
        .from('venture_team_positions')
        .select('capacity, occupied_count, status')
        .eq('id', positionId)
        .single()

      if (!position) {
        failures.push('Target position does not exist.')
      } else {
        if (position.status === 'archived') failures.push('Position is archived.')
        if (position.capacity !== null && position.occupied_count >= position.capacity) {
          failures.push('Position has reached its maximum capacity.')
        }
      }
    }

    // 5. Active Invitation Conflict Check
    const { data: activeInvite } = await this.supabase
      .from('venture_team_invitations')
      .select('id')
      .eq('venture_id', ventureId)
      .eq('invited_user_id', userId)
      .in('status', ['draft', 'sent', 'viewed', 'held'])
      .maybeSingle()

    if (activeInvite) {
      warnings.push('User already has a pending invitation for this venture.')
    }

    return {
      eligible: failures.length === 0,
      hard_failures: failures,
      warnings,
      evaluated_at: new Date().toISOString()
    }
  }
}