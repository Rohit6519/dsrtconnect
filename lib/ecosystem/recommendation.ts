// ============================================================
// lib/ecosystem/recommendation.ts
// Community recommendation engine.
//
// FIXED:
//   - Uses only columns that exist on public.users
//   - Batches friend-membership lookup (no more N+1)
//   - Skips zero-score candidates cleanly
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

const MODEL_VERSION = 'v1.1'

interface RecommendationCandidate {
  entity_type: string
  entity_id: string
  score: number
  reason_codes: string[]
  human_reason: string
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function extractLocationHint(locationData: any): string | null {
  if (!locationData) return null
  if (typeof locationData === 'string') return locationData.toLowerCase().trim() || null
  const parts = [
    locationData.city,
    locationData.town,
    locationData.region,
    locationData.state,
    locationData.country,
    locationData.formatted,
    locationData.name,
    locationData.label,
  ]
    .filter(Boolean)
    .map((s: string) => String(s).toLowerCase().trim())
    .filter(Boolean)
  return parts[0] || null
}

// -----------------------------------------------------------
// Core: compute recommendations for one identity
// -----------------------------------------------------------

export async function computeCommunityRecommendations(
  supabase: SupabaseClient,
  identityId: string,
  limit = 12
): Promise<RecommendationCandidate[]> {
  // 1. Load user signals — ONLY columns that exist
  const { data: user } = await supabase
    .from('users')
    .select(
      'preferred_categories, profile_tags, looking_for_opportunities, location_data, institution_id'
    )
    .eq('id', identityId)
    .maybeSingle()

  const topics = Array.from(
    new Set(
      [
        ...(user?.preferred_categories ?? []),
        ...(user?.profile_tags ?? []),
        ...(user?.looking_for_opportunities ?? []),
      ].map((t: string) => (t || '').toLowerCase())
    )
  ).filter(Boolean)

  const userLocation = extractLocationHint(user?.location_data)

  // 2. Communities the user is already in
  const { data: memberships } = await supabase
    .from('community_memberships')
    .select('community_id')
    .eq('identity_id', identityId)
    .in('status', ['ACTIVE', 'PENDING'])

  const memberCommunityIds = new Set((memberships || []).map((m: any) => m.community_id))

  // 3. Dismissed
  const { data: dismissed } = await supabase
    .from('community_discover_dismissals')
    .select('community_id')
    .eq('identity_id', identityId)
  const dismissedIds = new Set((dismissed || []).map((d: any) => d.community_id))

  // 4. Fetch candidate pool
  const { data: candidatesRaw } = await supabase
    .from('communities')
    .select(
      'id, name, slug, topics, category, location_text, is_verified, member_count, status, visibility'
    )
    .eq('status', 'ACTIVE')
    .in('visibility', ['PUBLIC', 'UNLISTED'])
    .order('member_count', { ascending: false })
    .limit(200)

  const candidates = (candidatesRaw || []).filter(
    (c: any) => !memberCommunityIds.has(c.id) && !dismissedIds.has(c.id)
  )

  if (candidates.length === 0) return []
  const candidateIds = candidates.map((c: any) => c.id)

  // 5. Friend membership signal — batched (was N+1)
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', identityId)
    .eq('following_type', 'user')
    .limit(500)

  const friendIds = (follows || []).map((f: any) => f.following_id).filter(Boolean)

  // Single query: how many friends are in each candidate community?
  const friendsPerCommunity = new Map<string, number>()
  if (friendIds.length > 0) {
    const { data: friendMems } = await supabase
      .from('community_memberships')
      .select('community_id')
      .in('identity_id', friendIds)
      .in('community_id', candidateIds)
      .eq('status', 'ACTIVE')

    for (const row of (friendMems || []) as any[]) {
      const n = friendsPerCommunity.get(row.community_id) || 0
      friendsPerCommunity.set(row.community_id, n + 1)
    }
  }

  // 6. Score
  const scored: RecommendationCandidate[] = []
  for (const c of candidates as any[]) {
    let score = 0
    const reasons: string[] = []

    const cTopics: string[] = Array.isArray(c.topics)
      ? c.topics.map((t: string) => String(t).toLowerCase())
      : []

    const overlap = cTopics.filter((t) => topics.includes(t)).length
    if (overlap > 0) {
      score += overlap * 10
      reasons.push('INTEREST_MATCH')
    }

    if (c.category && topics.includes(String(c.category).toLowerCase())) {
      score += 5
      reasons.push('CATEGORY_MATCH')
    }

    if (
      userLocation &&
      c.location_text &&
      String(c.location_text).toLowerCase().includes(userLocation)
    ) {
      score += 6
      reasons.push('LOCATION_MATCH')
    }

    if (c.is_verified) score += 2

    score += Math.log10((c.member_count || 0) + 1) * 2

    const friends = friendsPerCommunity.get(c.id) || 0
    if (friends > 0) {
      score += friends * 4
      reasons.push('NETWORK_SIGNAL')
    }

    if (score <= 0) continue

    const humanReason = reasons.includes('INTEREST_MATCH')
      ? 'Matches your interests'
      : reasons.includes('NETWORK_SIGNAL')
      ? 'People you follow are here'
      : reasons.includes('LOCATION_MATCH')
      ? 'Near your location'
      : reasons.includes('CATEGORY_MATCH')
      ? 'Aligned with your goals'
      : 'Popular on DSRT'

    scored.push({
      entity_type: 'community',
      entity_id: c.id,
      score,
      reason_codes: reasons,
      human_reason: humanReason,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

// -----------------------------------------------------------
// Persist to candidates table
// -----------------------------------------------------------

export async function refreshRecommendations(
  supabase: SupabaseClient,
  identityId: string
): Promise<{ refreshed: number }> {
  const candidates = await computeCommunityRecommendations(supabase, identityId, 24)

  // Mark existing as expired (rather than delete-then-insert gap)
  await supabase
    .from('ecosystem_recommendation_candidates')
    .update({ expires_at: new Date().toISOString() })
    .eq('identity_id', identityId)
    .eq('entity_type', 'community')
    .gt('expires_at', new Date().toISOString())

  if (candidates.length === 0) return { refreshed: 0 }

  const rows = candidates.map((c) => ({
    identity_id: identityId,
    entity_type: c.entity_type,
    entity_id: c.entity_id,
    score: c.score,
    reason_codes: c.reason_codes,
    human_reason: c.human_reason,
    model_version: MODEL_VERSION,
    generated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }))

  await supabase
    .from('ecosystem_recommendation_candidates')
    .upsert(rows, { onConflict: 'identity_id,entity_type,entity_id' })

  // Feature store snapshot
  const features = [
    { key: 'community_recommendations_count', value: candidates.length },
    { key: 'last_recommendation_refresh', value: Math.floor(Date.now() / 1000) },
  ]
  await supabase.from('ecosystem_recommendation_features').upsert(
    features.map((f) => ({
      identity_id: identityId,
      feature_key: f.key,
      value: f.value,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'identity_id,feature_key' }
  )

  return { refreshed: candidates.length }
}