import { UserIntelligenceProfile } from './intelligence-profile'

export interface ScoredPost {
  post: any
  score: number
  reasons: string[]
  isExploration: boolean
}

export function scorePostForUser(post: any, profile: UserIntelligenceProfile): ScoredPost {
  let score = 0
  const reasons: string[] = []

  if (profile.dislikedEntityIds.includes(post.id) || profile.dislikedEntityIds.includes(post.user_id)) {
    return { post, score: -999, reasons: [], isExploration: false }
  }

  const postTags = (post.tags || []).map((t: string) => t.toLowerCase())
  const authorId = post.publisher_type === 'person' ? post.publisher_id : post.user_id

  if (authorId && profile.followingIds.includes(authorId)) {
    score += 35
    reasons.push('From a builder you follow')
  }

  // ✅ FIX: Explicitly type 't' and 's' as string
  const matchingSearchTag = postTags.find((t: string) =>
    profile.recentSearchIntents.some((s: string) => s.toLowerCase().includes(t))
  )
  
  if (matchingSearchTag) {
    score += 30
    reasons.push(`Matches your recent search for "${matchingSearchTag}"`)
  }

  let highestTopicMatch: { topic: string; score: number } | null = null
  for (const tag of postTags) {
    const affinity = profile.topAffinityTopics.find(a => a.topic === tag)
    if (affinity && (!highestTopicMatch || affinity.score > highestTopicMatch.score)) {
      highestTopicMatch = affinity
    }
  }

  if (highestTopicMatch) {
    const boost = Math.min(25, highestTopicMatch.score * 1.2)
    score += boost
    reasons.push(`Based on your interest in #${highestTopicMatch.topic}`)
  }

  if (post.type === 'looking_for' && profile.explicitBrings.length > 0) {
    const contentLower = (post.content_text || post.content || '').toLowerCase()
    const matchesBring = profile.explicitBrings.some(b => contentLower.includes(b))
    if (matchesBring) {
      score += 20
      reasons.push('Looking for your specific skill set')
    }
  }

  const engagementScore =
    (post.like_count || 0) * 0.5 +
    (post.comment_count || 0) * 1.5 +
    (post.bookmark_count || 0) * 2.0 +
    (post.repost_count || 0) * 2.5
  score += Math.min(15, engagementScore)

  const postAgeHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)
  const freshnessPoints = Math.max(0, 25 - postAgeHours * 0.5)
  score += freshnessPoints

  const isExploration = !highestTopicMatch && !reasons.some(r => r.includes('follow'))

  if (reasons.length === 0) {
    reasons.push('Trending build across DSRT')
  }

  return {
    post,
    score: Math.round(score * 10) / 10,
    reasons: reasons.slice(0, 2),
    isExploration,
  }
}

export function applyDiversityFilter(scoredPosts: ScoredPost[]): ScoredPost[] {
  const finalFeed: ScoredPost[] = []
  const authorCountMap = new Map<string, number>()
  const tagCountMap = new Map<string, number>()

  for (const item of scoredPosts) {
    if (item.score < 0) continue

    const authorId = item.post.publisher_id || item.post.user_id || 'unknown'
    const primaryTag = item.post.tags?.[0]?.toLowerCase() || 'general'

    const authorCount = authorCountMap.get(authorId) || 0
    const tagCount = tagCountMap.get(primaryTag) || 0

    if (authorCount >= 2) continue
    if (tagCount >= 3) continue

    authorCountMap.set(authorId, authorCount + 1)
    tagCountMap.set(primaryTag, tagCount + 1)

    finalFeed.push(item)
  }

  return finalFeed
}