// ============================================
// DSRT SMART MATCHING ALGORITHM
// ============================================

export interface UserContext {
  id: string
  interest_topics?: string[]
  brings?: string[]
  seeking?: string[]
  location?: string | null
  tagline?: string | null
  skills?: string[]
  skill_categories?: string[]
  following_ids?: string[]
  community_ids?: string[]
  project_sectors?: string[]
  venture_sectors?: string[]
  activity_signals?: Array<{
    signal_type: string
    entity_type?: string
    entity_id?: string
    weight?: number
  }>
}

export interface Scoreable {
  id: string
  user_id?: string
  sector?: string | null
  tags?: string[] | null
  skills?: string[] | null
  goals?: string[] | null
  location?: string | null
  community_id?: string | null
  like_count?: number | null
  comment_count?: number | null
  bookmark_count?: number | null
  view_count?: number | null
  created_at: string
  post_category?: string | null
}

// ============================================
// POST SCORING
// ============================================
export function scorePost(post: Scoreable, ctx: UserContext): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  const userInterests = (ctx.interest_topics || []).map(t => t.toLowerCase())
  const userSkills = (ctx.skills || []).map(s => s.toLowerCase())
  const userSectors = [...(ctx.project_sectors || []), ...(ctx.venture_sectors || [])].map(s => s.toLowerCase())

  const postTags = (post.tags || []).map(t => t.toLowerCase())
  const postSkills = (post.skills || []).map(s => s.toLowerCase())
  const postSector = post.sector?.toLowerCase()

  const sharedInterests = postTags.filter(t => userInterests.includes(t))
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 10, 30)
    reasons.push(`${sharedInterests.length} shared interest${sharedInterests.length > 1 ? 's' : ''}`)
  }

  const sharedSkills = postSkills.filter(s => userSkills.includes(s))
  if (sharedSkills.length > 0) {
    score += Math.min(sharedSkills.length * 6, 25)
    reasons.push(`${sharedSkills.length} skill overlap`)
  }

  if (postSector && userSectors.includes(postSector)) {
    score += 20
    reasons.push('Same sector as your work')
  }

  if (post.user_id && ctx.following_ids?.includes(post.user_id)) {
    score += 15
    reasons.push('Following author')
  }

  if (post.community_id && ctx.community_ids?.includes(post.community_id)) {
    score += 12
    reasons.push('Your community')
  }

  if (post.location && ctx.location) {
    const userCity = ctx.location.split(',')[0]?.trim().toLowerCase()
    const postCity = post.location.split(',')[0]?.trim().toLowerCase()
    if (userCity && postCity) {
      if (userCity === postCity) {
        score += 10
        reasons.push('Same city')
      } else if (ctx.location.toLowerCase().includes(postCity) || post.location.toLowerCase().includes(userCity)) {
        score += 5
      }
    }
  }

  if (post.post_category === 'looking_for' && ctx.brings?.length) {
    score += 8
    if (post.goals?.some(g => ctx.brings?.some(b => g.toLowerCase().includes(b.toLowerCase())))) {
      score += 7
      reasons.push('Matches what you bring')
    }
  }

  const engagement =
    (post.like_count || 0) * 0.5 +
    (post.comment_count || 0) * 1.5 +
    (post.bookmark_count || 0) * 2 +
    (post.view_count || 0) * 0.05
  score += Math.min(engagement, 15)

  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000
  const freshnessScore = Math.max(20 - (ageHours / 8.4), 0)
  score += freshnessScore

  if (ctx.activity_signals?.length) {
    const relatedSignals = ctx.activity_signals.filter(s => {
      if (!s.entity_id) return false
      return s.entity_id === post.user_id || s.entity_id === post.id || s.entity_id === post.community_id
    })
    score += Math.min(relatedSignals.length * 2, 10)
  }

  return { score: Math.round(score * 100) / 100, reasons }
}

// ============================================
// BUILDER MATCH SCORING
// ============================================
export interface BuilderCandidate {
  id: string
  full_name?: string | null
  username?: string | null
  interest_topics?: string[] | null
  brings?: string[] | null
  seeking?: string[] | null
  location?: string | null
  execution_score?: number | null
  follower_count?: number | null
  skills?: string[]
  skill_categories?: string[]
  sectors?: string[]
}

export function scoreBuilderMatch(candidate: BuilderCandidate, ctx: UserContext): {
  score: number
  matchPercent: number
  reasons: string[]
} {
  let score = 0
  const reasons: string[] = []

  const userInterests = (ctx.interest_topics || []).map(t => t.toLowerCase())
  const userSkillCats = (ctx.skill_categories || []).map(c => c.toLowerCase())
  const userSectors = [...(ctx.project_sectors || []), ...(ctx.venture_sectors || [])].map(s => s.toLowerCase())

  const candInterests = (candidate.interest_topics || []).map(t => t.toLowerCase())
  const candBrings = (candidate.brings || []).map(b => b.toLowerCase())
  const candSkillCats = (candidate.skill_categories || []).map(c => c.toLowerCase())
  const candSectors = (candidate.sectors || []).map(s => s.toLowerCase())

  const sharedInterests = candInterests.filter(i => userInterests.includes(i))
  score += Math.min(sharedInterests.length * 10, 30)
  if (sharedInterests.length > 0) reasons.push(`${sharedInterests.length} shared interest${sharedInterests.length > 1 ? 's' : ''}`)

  const userBrings = (ctx.brings || []).map(b => b.toLowerCase())
  const userSeeking = (ctx.seeking || []).map(s => s.toLowerCase())

  const complementaryPairs = [
    ['visionary', 'builder'], ['builder', 'visionary'],
    ['builder', 'launcher'], ['launcher', 'builder'],
    ['visionary', 'launcher'], ['launcher', 'visionary'],
  ]
  const isComplementary = complementaryPairs.some(([a, b]) =>
    userBrings.includes(a) && candBrings.includes(b)
  )
  if (isComplementary) {
    score += 25
    reasons.push('Complementary roles')
  }

  const seekingMatch = candBrings.some(b => userSeeking.some(s => s.includes(b) || b.includes(s)))
  if (seekingMatch) {
    score += 30
    reasons.push('Matches what you seek')
  }

  const sharedSectors = candSectors.filter(s => userSectors.includes(s))
  if (sharedSectors.length > 0) {
    score += Math.min(sharedSectors.length * 10, 20)
    reasons.push('Same sector')
  }

  const sharedCats = candSkillCats.filter(c => userSkillCats.includes(c))
  score += Math.min(sharedCats.length * 5, 15)
  if (sharedCats.length > 0 && reasons.length === 0) reasons.push('Similar domain')

  if (candidate.location && ctx.location) {
    const userCity = ctx.location.split(',')[0]?.trim().toLowerCase()
    const candCity = candidate.location.split(',')[0]?.trim().toLowerCase()
    if (userCity && candCity && userCity === candCity) {
      score += 12
      reasons.push('Same city')
    }
  }

  score += Math.min((candidate.execution_score || 0) / 20, 10)
  score += Math.min((candidate.follower_count || 0) / 50, 5)

  const matchPercent = Math.min(99, Math.max(60, Math.round(score * 0.85)))

  return {
    score: Math.round(score * 100) / 100,
    matchPercent,
    reasons: reasons.slice(0, 3),
  }
}

export function scoreTrending(item: { count: number; recency_hours?: number }): number {
  const recency = item.recency_hours ?? 24
  return item.count / Math.pow(recency + 2, 0.8)
}