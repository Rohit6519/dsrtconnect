// ═══════════════════════════════════════════════════════════════
// VENTURE RECOMMENDATION ENGINE
// ─────────────────────────────────────────────────────────────
// Design principles:
// 1. 70/30 preferences/exploration split (YouTube model)
// 2. Decay by scroll depth (relevance fades)
// 3. Diversification (no 5+ same-domain in a row)
// 4. Signal-based (views, connects, saves influence future)
// 5. Community boost
// 6. Freshness bonus
// 7. Never-ending feed
// ═══════════════════════════════════════════════════════════════

export interface VentureCandidate {
  id: string
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  industry?: string | null
  sector?: string | null
  tags?: string[] | null
  venture_type?: string | null
  stage?: string | null
  follower_count: number
  view_count: number
  is_verified: boolean
  is_hiring: boolean
  seeking_investment: boolean
  seeking_cofounder: boolean
  last_activity_at: string
  created_at: string
  // enriched
  team_count?: number
  open_roles_count?: number
  community_ids?: string[]
  _score?: number
  _matchReasons?: string[]
  _bucket?: 'preferred' | 'exploration'
}

export interface RankingContext {
  userCategories: string[]
  userCommunityIds: string[]
  dismissedIds: Set<string>
  viewedIds: Set<string>
  connectedIds: Set<string>
  savedIds: Set<string>
  scrollDepth: number  // 0..N (used for decay)
  activeDomain?: string | null
  activeType?: string | null
}

// ─── Weights (tunable) — hybrid ranking (Batch 9b) ─────────────
const WEIGHTS = {
  // Domain matches
  domainMatchExact: 40,
  domainMatchPartial: 20,

  // Community — BOOSTED so hybrid ranking works properly
  // Both community AND domain match = 40 + 30 = 70 (highest)
  // Domain-only = 40
  // Community-only = 30
  // General = base score only
  communityMatch: 30,
  communityAndDomainBonus: 15,  // extra kick when BOTH match

  // Trust signals
  verifiedBonus: 8,
  hiringBonus: 5,
  raisingBonus: 5,
  cofounderBonus: 4,

  // Freshness
  freshnessMax: 15,
  freshnessDecayHours: 168,

  // Social proof
  followerLog: 6,
  viewLog: 3,

  // Team/roles
  teamSizeBonus: 4,
  openRolesBonus: 3,

  // Personal signals
  connectedBoost: 20,
  savedBoost: 15,
  viewedPenalty: -12,
  dismissedHardBlock: -9999,

  // Exploration
  explorationRandom: 30,
  scrollDepthDecay: 0.85,
}

// ─── Utilities ─────────────────────────────────────────────────

function safeLog(n: number): number {
  return Math.log10(Math.max(1, n))
}

function hoursSince(dateStr: string): number {
  if (!dateStr) return 999
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
}

function textContainsAny(text: string, terms: string[]): boolean {
  const t = (text || '').toLowerCase()
  return terms.some(term => t.includes(term.toLowerCase()))
}

// ─── Core scoring ──────────────────────────────────────────────

export function scoreVenture(v: VentureCandidate, ctx: RankingContext): VentureCandidate {
  const reasons: string[] = []
  let score = 0

  // 0. Dismissed = hard block
  if (ctx.dismissedIds.has(v.id)) {
    return { ...v, _score: WEIGHTS.dismissedHardBlock, _matchReasons: ['dismissed'] }
  }

  
  // 1. Domain match against user categories
  if (ctx.userCategories.length > 0) {
    const cats = ctx.userCategories.map(c => c.toLowerCase())
    const industryLower = (v.industry || '').toLowerCase()
    const sectorLower = (v.sector || '').toLowerCase()
    const tagsLower = (v.tags || []).map(t => t.toLowerCase())
    
    for (const cat of cats) {
      if (industryLower === cat || sectorLower === cat || tagsLower.includes(cat)) {
        score += WEIGHTS.domainMatchExact
        reasons.push('domain-exact:' + cat)
        break
      }
    }
    if (!reasons.some(r => r.startsWith('domain-exact'))) {
      for (const cat of cats) {
        if (
          industryLower.includes(cat) ||
          sectorLower.includes(cat) ||
          tagsLower.some(t => t.includes(cat))
        ) {
          score += WEIGHTS.domainMatchPartial
          reasons.push('domain-partial:' + cat)
          break
        }
      }
    }
  }

  // 2. Community overlap (Batch 9b — hybrid ranking)
  let hasCommunityMatch = false
  if (ctx.userCommunityIds.length > 0 && v.community_ids && v.community_ids.length > 0) {
    const overlap = v.community_ids.some(cid => ctx.userCommunityIds.includes(cid))
    if (overlap) {
      score += WEIGHTS.communityMatch
      reasons.push('community-match')
      hasCommunityMatch = true
    }
  }

  // 2b. HYBRID BOOST: items matching BOTH domain AND community get extra weight
  // This ensures: both > domain-only > community-only > general
  const hasDomainMatch = reasons.some(r => r.startsWith('domain-'))
  if (hasCommunityMatch && hasDomainMatch) {
    score += WEIGHTS.communityAndDomainBonus
    reasons.push('community-and-domain-match')
  }

  // 3. Trust signals
  if (v.is_verified) { score += WEIGHTS.verifiedBonus; reasons.push('verified') }
  if (v.is_hiring) { score += WEIGHTS.hiringBonus; reasons.push('hiring') }
  if (v.seeking_investment) { score += WEIGHTS.raisingBonus; reasons.push('raising') }
  if (v.seeking_cofounder) { score += WEIGHTS.cofounderBonus; reasons.push('cofounder') }

  // 4. Freshness
  const hours = hoursSince(v.last_activity_at || v.created_at)
  if (hours < WEIGHTS.freshnessDecayHours) {
    const freshness = WEIGHTS.freshnessMax * (1 - hours / WEIGHTS.freshnessDecayHours)
    score += freshness
    if (freshness > 5) reasons.push('fresh')
  }

  // 5. Social proof (log-scaled)
  score += WEIGHTS.followerLog * safeLog(v.follower_count || 0)
  score += WEIGHTS.viewLog * safeLog(v.view_count || 0)

  // 6. Team/roles
  if ((v.team_count || 0) > 1) score += WEIGHTS.teamSizeBonus
  if ((v.open_roles_count || 0) > 0) score += WEIGHTS.openRolesBonus

  // 7. Personal signal history
  if (ctx.connectedIds.has(v.id)) { score += WEIGHTS.connectedBoost; reasons.push('connected-before') }
  if (ctx.savedIds.has(v.id)) { score += WEIGHTS.savedBoost; reasons.push('saved') }
  if (ctx.viewedIds.has(v.id)) { score += WEIGHTS.viewedPenalty }

  // 8. Scroll depth decay (relevance fades as you go deeper)
  if (ctx.scrollDepth > 0) {
    const decay = Math.pow(WEIGHTS.scrollDepthDecay, ctx.scrollDepth / 24)
    score = score * decay
  }

  return { ...v, _score: score, _matchReasons: reasons, _bucket: 'preferred' }
}

// ─── Exploration bucket (30%) ──────────────────────────────────
// Deliberately shows things OUTSIDE user's preferences
// to prevent filter bubbles + discovery
// ─────────────────────────────────────────────────────────────

export function scoreForExploration(v: VentureCandidate, ctx: RankingContext): VentureCandidate {
  if (ctx.dismissedIds.has(v.id)) {
    return { ...v, _score: WEIGHTS.dismissedHardBlock, _bucket: 'exploration' }
  }

  let score = Math.random() * WEIGHTS.explorationRandom

  // Still respect trust
  if (v.is_verified) score += WEIGHTS.verifiedBonus * 0.5
  score += safeLog(v.follower_count || 0) * 2

  // Freshness matters for exploration
  const hours = hoursSince(v.last_activity_at || v.created_at)
  if (hours < WEIGHTS.freshnessDecayHours) {
    score += WEIGHTS.freshnessMax * 0.5 * (1 - hours / WEIGHTS.freshnessDecayHours)
  }

  // Penalize viewed (don't waste exploration slot on something they've seen)
  if (ctx.viewedIds.has(v.id)) score -= 20

  return { ...v, _score: score, _bucket: 'exploration', _matchReasons: ['exploration'] }
}

// ─── Diversification pass ──────────────────────────────────────
// Prevent 5+ same-domain ventures in a row
// ─────────────────────────────────────────────────────────────

export function diversify(items: VentureCandidate[], maxConsecutive = 3): VentureCandidate[] {
  if (items.length <= maxConsecutive) return items

  const result: VentureCandidate[] = []
  const bench: VentureCandidate[] = []
  let lastDomain = ''
  let runLength = 0

  for (const item of items) {
    const domain = (item.industry || item.sector || '').toLowerCase()
    if (domain === lastDomain && runLength >= maxConsecutive) {
      bench.push(item)
      continue
    }
    result.push(item)
    if (domain === lastDomain) {
      runLength++
    } else {
      lastDomain = domain
      runLength = 1
    }
  }

  // Interleave benched items
  if (bench.length > 0) {
    const spacing = Math.max(2, Math.floor(result.length / bench.length))
    for (let i = 0; i < bench.length; i++) {
      const pos = Math.min(result.length, (i + 1) * spacing)
      result.splice(pos, 0, bench[i])
    }
  }

  return result
}

// ─── Main ranking function ─────────────────────────────────────
// Applies 70/30 split, scoring, diversification
// ─────────────────────────────────────────────────────────────

export function rankVentures(
  candidates: VentureCandidate[],
  ctx: RankingContext,
  targetCount = 24,
  preferredRatio = 0.7
): VentureCandidate[] {
  if (candidates.length === 0) return []

  const preferredCount = Math.round(targetCount * preferredRatio)
  const explorationCount = targetCount - preferredCount

  // If user has no categories, everything is exploration
  const hasPreferences = ctx.userCategories.length > 0

  if (!hasPreferences) {
    const explored = candidates
      .map(v => scoreForExploration(v, ctx))
      .filter(v => (v._score || 0) > WEIGHTS.dismissedHardBlock)
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .slice(0, targetCount)
    return diversify(explored)
  }

  // Score all candidates as "preferred"
  const preferredScored = candidates
    .map(v => scoreVenture(v, ctx))
    .filter(v => (v._score || 0) > WEIGHTS.dismissedHardBlock)
    .sort((a, b) => (b._score || 0) - (a._score || 0))

  // Take preferred slots (only ones with real matches)
  const preferred = preferredScored
    .filter(v => (v._matchReasons || []).some(r => r.startsWith('domain-') || r === 'community-match'))
    .slice(0, preferredCount)

  const usedIds = new Set(preferred.map(v => v.id))

  // For exploration: take candidates NOT in preferred, randomize
  const explorationPool = candidates.filter(v => !usedIds.has(v.id))
  const explored = explorationPool
    .map(v => scoreForExploration(v, ctx))
    .filter(v => (v._score || 0) > WEIGHTS.dismissedHardBlock)
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, explorationCount)

  // Interleave: 3 preferred, 1 exploration pattern for organic feel
  const merged: VentureCandidate[] = []
  let pi = 0, ei = 0
  while (pi < preferred.length || ei < explored.length) {
    for (let k = 0; k < 3 && pi < preferred.length; k++) merged.push(preferred[pi++])
    if (ei < explored.length) merged.push(explored[ei++])
  }

  // If we didn't fill targetCount, top up with remaining preferred (higher scored ones not matched)
  if (merged.length < targetCount) {
    const remaining = preferredScored.filter(v => !merged.some(m => m.id === v.id))
    for (const r of remaining) {
      if (merged.length >= targetCount) break
      merged.push(r)
    }
  }

  return diversify(merged.slice(0, targetCount))
}