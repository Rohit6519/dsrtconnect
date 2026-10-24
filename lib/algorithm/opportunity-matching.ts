import { UserIntelligenceProfile } from './intelligence-profile'

export interface ScoredOpportunity {
  opp: any
  matchScore: number
}

// Advanced Graph-like Skill Transferability Weights
const SKILL_GRAPH: Record<string, Record<string, number>> = {
  'python': { 'fastapi': 0.8, 'django': 0.8, 'data science': 0.7, 'machine learning': 0.9, 'pytorch': 0.6 },
  'react': { 'next.js': 0.9, 'typescript': 0.7, 'javascript': 0.8, 'frontend': 0.9, 'ui/ux': 0.4 },
  'typescript': { 'react': 0.7, 'next.js': 0.7, 'node.js': 0.8, 'javascript': 1.0 },
  'machine learning': { 'pytorch': 0.9, 'tensorflow': 0.9, 'deep learning': 1.0, 'nlp': 0.8, 'computer vision': 0.8, 'python': 0.7 },
}

export function scoreOpportunityForUser(
  opp: any,
  profile: UserIntelligenceProfile
): number {
  let score = 0

  const reqSkills = (opp.required_skills || []).map((s: string) => s.toLowerCase())
  const oppType = (opp.opportunity_type || '').toLowerCase()
  
  // 1. HARD FILTER PENALTIES (Don't recommend things they hate)
  if (profile.dislikedEntityIds.includes(opp.id)) return -999

  // 2. SKILL GRAPH MATCHING (Weight: 35%)
  let skillScore = 0
  if (reqSkills.length > 0) {
    let rawSkillPoints = 0
    for (const reqSkill of reqSkills) {
      if (profile.explicitSkills.includes(reqSkill)) {
        rawSkillPoints += 1.0 // Exact Match
      } else {
        // Semantic Transferability Match
        let bestTransfer = 0
        for (const userSkill of profile.explicitSkills) {
          const transferWeight = SKILL_GRAPH[userSkill]?.[reqSkill] || 0
          if (transferWeight > bestTransfer) bestTransfer = transferWeight
        }
        rawSkillPoints += bestTransfer
      }
    }
    skillScore = (rawSkillPoints / reqSkills.length) * 35
  } else {
    skillScore = 15 // Baseline if no skills required
  }
  score += Math.min(35, skillScore)

  // 3. CAREER INTENT & ROLE COMPATIBILITY (Weight: 20%)
  const userBrings = profile.explicitBrings.map(b => b.toLowerCase())
  const userSeeking = profile.explicitSeeking.map(s => s.toLowerCase())

  if (['hire', 'freelance', 'contract'].includes(oppType) && userBrings.some(b => ['builder', 'maker', 'professional'].includes(b))) {
    score += 20
  } else if (['cofounder', 'team-up'].includes(oppType) && (userBrings.includes('visionary') || userSeeking.includes('cofounder'))) {
    score += 20
  } else if (oppType === 'mentorship' && userBrings.includes('mentor')) {
    score += 20
  } else {
    score += 8 // Minor bump for general exploration
  }

  // 4. BEHAVIORAL AFFINITY (Weight: 20%)
  const oppSearchable = `${opp.title || ''} ${opp.description || ''}`.toLowerCase()
  let topicScore = 0
  for (const affinity of profile.topAffinityTopics) {
    if (oppSearchable.includes(affinity.topic)) {
      topicScore += Math.min(10, affinity.score * 0.8) // Decayed behavior score
    }
  }
  score += Math.min(20, topicScore)

  // 5. TRUST, QUALITY & FRESHNESS (Weight: 25%)
  const ageDays = (Date.now() - new Date(opp.published_at || opp.created_at).getTime()) / 86400000
  score += Math.max(0, 15 - (ageDays * 0.5)) // Freshness

  if (opp.poster?.is_verified) score += 5 // Trust
  if (opp.is_featured) score += 5 // Quality

  // 6. OUTCOME PROBABILITY (Reduce score if overcrowded)
  if (opp.application_count > 20) score -= 10 // Fatigue / Overcrowded penalty
  if (opp.application_count === 0) score += 5 // Cold start boost

  return Math.round(score * 10) / 10
}

/**
 * Stage 3: Diversity and Exploration (MMR Concept)
 * Prevents Echo Chambers. Ensures 15% Exploration content.
 */
export function applyOpportunityDiversity(
  candidates: ScoredOpportunity[], 
  limit: number
): any[] {
  const finalFeed: any[] = []
  const authorCaps = new Map<string, number>()
  const typeCaps = new Map<string, number>()
  
  let explorationCount = 0
  const targetExploration = Math.ceil(limit * 0.15) // 15% exploration

  for (const item of candidates) {
    if (finalFeed.length >= limit) break
    if (item.matchScore < 0) continue

    const authorId = item.opp.poster_user_id || 'unknown'
    const type = item.opp.opportunity_type || 'general'

    // Diversity Constraint: Max 2 from same poster
    if ((authorCaps.get(authorId) || 0) >= 2) continue
    // Diversity Constraint: Max 40% of feed can be one single opportunity type
    if ((typeCaps.get(type) || 0) >= limit * 0.4) continue

    // Exploration Injection (Inject moderate-scored items periodically)
    const isExploration = item.matchScore < 40 && item.matchScore > 15
    if (isExploration) {
      if (explorationCount >= targetExploration) continue
      explorationCount++
    }

    authorCaps.set(authorId, (authorCaps.get(authorId) || 0) + 1)
    typeCaps.set(type, (typeCaps.get(type) || 0) + 1)
    finalFeed.push(item.opp)
  }

  return finalFeed
}