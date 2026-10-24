import { adminClient } from '@/lib/supabase/admin'

export interface RateLimitCheckResult {
  passed: boolean
  currentVelocity1m: number
  currentVelocity1h: number
  riskPenaltyScore: number // 0.0 (normal) to 1.0 (heavy anomaly)
  reason?: string
}

/**
 * Non-blocking velocity engine for DSRT Mail.
 * Tracks burst behavior for risk scoring without cutting off real users.
 */
export async function checkSenderVelocity(
  identityId: string,
  sourceIp?: string
): Promise<RateLimitCheckResult> {
  try {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // 1. Count messages in last 1 minute
    const { count: count1m } = await adminClient
      .from('mail_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_identity_id', identityId)
      .gte('sent_at', oneMinAgo)

    // 2. Count messages in last 1 hour
    const { count: count1h } = await adminClient
      .from('mail_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_identity_id', identityId)
      .gte('sent_at', oneHourAgo)

    const v1m = count1m || 0
    const v1h = count1h || 0

    // Compute non-blocking risk penalty
    let riskPenalty = 0.0
    if (v1m > 30) riskPenalty += 0.35 // rapid burst
    if (v1h > 300) riskPenalty += 0.45 // high volume

    return {
      passed: true, // Non-blocking: always let flow proceed to classification
      currentVelocity1m: v1m,
      currentVelocity1h: v1h,
      riskPenaltyScore: Math.min(riskPenalty, 1.0),
      reason: riskPenalty > 0 ? 'HIGH_VELOCITY_BURST' : undefined,
    }
  } catch (e) {
    console.error('[RateLimitEngine Error]', e)
    return {
      passed: true,
      currentVelocity1m: 0,
      currentVelocity1h: 0,
      riskPenaltyScore: 0.0,
    }
  }
}