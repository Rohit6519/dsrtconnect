import { adminClient } from '@/lib/supabase/admin'

export interface ReputationSummary {
  score: number // 0.0000 (dangerous) to 1.0000 (highly trusted)
  totalEvents: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const DECAY_LAMBDA = 0.05 // Exponential decay rate per day

/**
 * Calculates current time-decay reputation score for any entity (IP, Domain, Sender).
 */
export async function getEntityReputation(
  entityType: 'IP' | 'DOMAIN' | 'SENDER' | 'URL_DOMAIN' | 'CAMPAIGN',
  entityValue: string
): Promise<ReputationSummary> {
  if (!entityValue) return { score: 0.5, totalEvents: 0, riskLevel: 'LOW' }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: events } = await adminClient
      .from('mail_reputation_events')
      .select('score_delta, created_at')
      .eq('entity_type', entityType)
      .eq('entity_value', entityValue.toLowerCase())
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })

    if (!events || events.length === 0) {
      return { score: 0.5, totalEvents: 0, riskLevel: 'LOW' } // Neutral base score
    }

    let weightedScore = 0.5 // Start neutral
    const now = Date.now()

    for (const evt of events) {
      const ageDays = (now - new Date(evt.created_at).getTime()) / (1000 * 60 * 60 * 24)
      const weight = Math.exp(-DECAY_LAMBDA * ageDays)
      weightedScore += Number(evt.score_delta) * weight
    }

    // Clamp score between 0.0 and 1.0
    const finalScore = Math.max(0.0, Math.min(1.0, weightedScore))

    let riskLevel: ReputationSummary['riskLevel'] = 'LOW'
    if (finalScore < 0.2) riskLevel = 'CRITICAL'
    else if (finalScore < 0.4) riskLevel = 'HIGH'
    else if (finalScore < 0.6) riskLevel = 'MEDIUM'

    return {
      score: Number(finalScore.toFixed(4)),
      totalEvents: events.length,
      riskLevel,
    }
  } catch (e) {
    console.error('[ReputationEngine Error]', e)
    return { score: 0.5, totalEvents: 0, riskLevel: 'LOW' }
  }
}

/**
 * Logs a reputation event for an entity.
 */
export async function recordReputationEvent(
  entityType: 'IP' | 'DOMAIN' | 'SENDER' | 'URL_DOMAIN' | 'CAMPAIGN',
  entityValue: string,
  scoreDelta: number,
  reason: string,
  windowBucket = '24h'
): Promise<void> {
  try {
    await adminClient.from('mail_reputation_events').insert({
      entity_type: entityType,
      entity_value: entityValue.toLowerCase(),
      score_delta: scoreDelta,
      reason,
      window_bucket: windowBucket,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[Record Reputation Event Error]', e)
  }
}