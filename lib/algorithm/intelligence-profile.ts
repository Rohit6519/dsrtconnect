import { SupabaseClient } from '@supabase/supabase-js'

export interface TopicAffinity {
  topic: string
  score: number
  source: 'explicit' | 'behavior' | 'search_intent'
}

export interface UserIntelligenceProfile {
  userId: string
  explicitSkills: string[]
  explicitInterests: string[]
  explicitBrings: string[]
  explicitSeeking: string[]
  followingIds: string[]
  topAffinityTopics: TopicAffinity[]
  recentSearchIntents: string[]
  dislikedEntityIds: string[]
  dislikedTopics: string[]
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  apply: 5.0,
  contact: 5.0,
  save: 4.0,
  share: 4.0,
  comment: 3.5,
  like: 2.5,
  repost: 2.5,
  long_view: 1.5,
  visit: 1.0,
  click: 0.8,
  view: 0.2,
  dismiss: -4.0,
  hide: -6.0,
  mute: -10.0,
}

const DECAY_HALF_LIFE_DAYS = 7

function getDecayFactor(createdAtIso: string): number {
  const ageMs = Date.now() - new Date(createdAtIso).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return Math.exp(-Math.LN2 * (ageDays / DECAY_HALF_LIFE_DAYS))
}

export async function getUserIntelligenceProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserIntelligenceProfile> {
  const [userRes, signalsRes, searchesRes, followsRes] = await Promise.all([
    supabase
      .from('users')
      .select('interest_topics, brings, seeking, focus_sectors, preferred_categories, profile_tags')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_activity_signals')
      .select('signal_type, entity_type, entity_id, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('user_search_history')
      .select('query, extracted_tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId),
  ])

  // ✅ FIX: Explicitly type user as 'any' to bypass strict TS checking on the object properties
  const user: any = userRes.data || {}
  const signals = signalsRes.data || []
  const searches = searchesRes.data || []
  const follows = followsRes.data || []

  const explicitInterests = [
    ...(user.interest_topics || []),
    ...(user.focus_sectors || []),
    ...(user.preferred_categories || []),
    ...(user.profile_tags || []),
  ].map((t: string) => t.toLowerCase())

  const explicitSkills = (user.profile_tags || []).map((s: string) => s.toLowerCase())
  const explicitBrings = (user.brings || []).map((b: string) => b.toLowerCase())
  const explicitSeeking = (user.seeking || []).map((s: string) => s.toLowerCase())
  const followingIds = follows.map((f: any) => f.following_id)

  const topicScores = new Map<string, { score: number; source: TopicAffinity['source'] }>()

  for (const topic of explicitInterests) {
    topicScores.set(topic, { score: 20.0, source: 'explicit' })
  }

  const dislikedEntityIds: string[] = []
  const dislikedTopics: string[] = []

  for (const sig of signals) {
    const weight = SIGNAL_WEIGHTS[sig.signal_type] || 0.1
    const decay = getDecayFactor(sig.created_at)
    const effectivePoints = weight * decay

    if (weight < 0) {
      if (sig.entity_id) dislikedEntityIds.push(sig.entity_id)
      if (sig.metadata?.tags) {
        sig.metadata.tags.forEach((t: string) => dislikedTopics.push(t.toLowerCase()))
      }
      continue
    }

    const tags: string[] = sig.metadata?.tags || sig.metadata?.keywords || []
    for (const tag of tags) {
      const clean = tag.toLowerCase()
      const existing = topicScores.get(clean) || { score: 0, source: 'behavior' }
      topicScores.set(clean, {
        score: existing.score + effectivePoints,
        source: existing.source === 'explicit' ? 'explicit' : 'behavior',
      })
    }
  }

  const recentSearchIntents: string[] = []
  for (const s of searches) {
    recentSearchIntents.push(s.query)
    const decay = getDecayFactor(s.created_at)
    const tags: string[] = s.extracted_tags || []

    for (const tag of tags) {
      const clean = tag.toLowerCase()
      const existing = topicScores.get(clean) || { score: 0, source: 'search_intent' }
      topicScores.set(clean, {
        score: existing.score + 15.0 * decay,
        source: 'search_intent',
      })
    }
  }

  const topAffinityTopics: TopicAffinity[] = Array.from(topicScores.entries())
    .map(([topic, data]) => ({ topic, score: Math.round(data.score * 10) / 10, source: data.source }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)

  return {
    userId,
    explicitSkills,
    explicitInterests,
    explicitBrings,
    explicitSeeking,
    followingIds,
    topAffinityTopics,
    recentSearchIntents,
    dislikedEntityIds,
    dislikedTopics,
  }
}