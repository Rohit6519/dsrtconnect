import { adminClient } from '@/lib/supabase/admin'

export type TrustEventType = 
  | 'PROFILE_COMPLETED'
  | 'AVATAR_UPLOADED'
  | 'FIRST_POST'
  | 'FIRST_PROJECT_CREATED'
  | 'FIRST_VENTURE_CREATED'
  | 'FIRST_COMMUNITY_JOINED'
  | 'FIRST_OPPORTUNITY_APPLIED'
  | 'RECEIVED_ENGAGEMENT'
  | 'RECEIVED_FOLLOWER'
  | 'STABLE_LOGIN_PATTERN'
  | 'DAILY_ACTIVE_STREAK'
  | 'HIGH_QUALITY_CONTENT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SPAM_INDICATOR'
  | 'MULTIPLE_FAILED_LOGINS'

export class TrustEngine {
  /**
   * Records a trust event and automatically recalculates the user's score and tier.
   * Call this fire-and-forget from your other API routes (e.g., when a user creates a project).
   */
  static async recordEvent(userId: string, eventType: TrustEventType, metadata: Record<string, any> = {}) {
    try {
      const { data, error } = await adminClient.rpc('record_trust_event', {
        p_user_id: userId,
        p_event_type: eventType,
        p_metadata: metadata
      })
      
      if (error) {
        console.error('[TrustEngine] Failed to record event:', error.message)
        return null
      }
      
      return data // Returns { trust_score, delta }
    } catch (err) {
      console.error('[TrustEngine] Exception:', err)
      return null
    }
  }

  /**
   * Recomputes the entire trust score from scratch based on current DB state.
   * Useful to run nightly or after a major profile update.
   */
  static async recomputeScore(userId: string) {
    try {
      const { data, error } = await adminClient.rpc('compute_trust_score', {
        p_user_id: userId
      })
      return !error ? data : null
    } catch {
      return null
    }
  }
}