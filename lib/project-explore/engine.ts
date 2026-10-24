// ============================================================================
// PROJECT EXPLORE — Multi-Stage Recommendation Engine
// ============================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  ExploreProjectCard,
  ExploreProjectModule,
  ExploreProjectFilterState,
  REASON_CODES,
} from './types'
import { parseProjectQuery } from './query-parser'

const PAGE_SIZE = 12
const MAX_CANDIDATE_POOL = 500

export class ProjectExploreEngine {
  constructor(
    private supabase: SupabaseClient,
    private userId?: string,
    private sessionId?: string,
    private variant: string = 'v1'
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // MAIN FEED GENERATOR
  // ─────────────────────────────────────────────────────────────────
  async generateFeed(
    filters: ExploreProjectFilterState = {},
    activeTab: string = 'recommended',
    cursor?: string
  ): Promise<{
    modules: ExploreProjectModule[]
    nextCursor?: string | null
    ranking_version?: string
  }> {

    // 1. Gather user state in parallel
    const [
      negativeProjectIds,
      userAffinities,
      sessionAffinities,
      followedIds,
      savedIds,
    ] = await Promise.all([
      this.getNegativeProjectIds(),
      this.getUserDomainAffinities(),
      this.getSessionAffinities(),
      this.getFollowedProjectIds(),
      this.getSavedProjectIds(),
    ])

    const cursorData = this.parseCursor(cursor)
    const pageDepth = cursorData?.depth || 0
    const seenIds = cursorData?.seen || []

    // 2. Parse semantic search into filters
    if (filters.search) {
      const parsed = parseProjectQuery(filters.search)
      if (parsed.stage && !filters.stages?.includes(parsed.stage)) {
        filters.stages = [...(filters.stages || []), parsed.stage]
      }
      if (parsed.location && !filters.locations?.includes(parsed.location)) {
        filters.locations = [...(filters.locations || []), parsed.location]
      }
      if (parsed.domain_names.length > 0) {
        filters.domains = [...new Set([...(filters.domains || []), ...parsed.domain_names])]
      }
      if (parsed.technology_names.length > 0) {
        filters.technologies = [...new Set([...(filters.technologies || []), ...parsed.technology_names])]
      }
      if (parsed.project_type && !filters.project_types?.includes(parsed.project_type)) {
        filters.project_types = [...(filters.project_types || []), parsed.project_type]
      }
      if (parsed.license && !filters.licenses?.includes(parsed.license)) {
        filters.licenses = [...(filters.licenses || []), parsed.license]
      }
      if (parsed.is_open_source) filters.is_open_source = true
      if (parsed.is_looking_for_collaborators) filters.is_looking_for_collaborators = true
      if (parsed.is_hiring) filters.is_hiring = true
    }

    // 3. Build base query
    let query = this.supabase
      .from('projects')
      .select(`
        id, slug, name, tagline, short_description, description,
        logo_url, cover_image_url, icon, color,
        stage, status, industry, sector, location, project_type, project_number,
        team_size, open_roles, follower_count, view_count, save_count,
        is_dsrt_verified, is_open_source, license,
        category, tech_stack,
        repository_url, repository_stars, repository_contributors,
        collaboration_status, parent_venture_id,
        last_activity_at, created_at, updated_at, published_at,
        discovery_rank_seed,
        founder:users!projects_founder_id_fkey(id, full_name, username, avatar_url, is_verified),
        founder_id, user_id
      `)
      .not('status', 'in', '("archived","draft")') // FIXED: Strictly exclude drafts and archived
      .or('is_public.eq.true,visibility.eq.public')

    // Exclude dismissed
    if (negativeProjectIds.length > 0) {
      query = query.not('id', 'in', `(${negativeProjectIds.join(',')})`)
    }

    // Exclude own projects from Explore (spec: Explore = discover others)
    if (this.userId) {
      query = query.or(`founder_id.neq.${this.userId},founder_id.is.null`)
    }

    // 4. Apply search keyword filter (text match on residual keywords)
    if (filters.search) {
      const parsed = parseProjectQuery(filters.search)
      if (parsed.keywords.length > 0) {
        const kFilters = parsed.keywords
          .map(k => `name.ilike.%${k}%,tagline.ilike.%${k}%,short_description.ilike.%${k}%,description.ilike.%${k}%`)
          .join(',')
        query = query.or(kFilters)
      }
    }

    // 5. Domain filter (normalized via M:N + legacy category array fallback)
    if (filters.domains && filters.domains.length > 0) {
      // Try to resolve normalized domain IDs first
      const domainProjectIds = await this.getProjectIdsByDomainNames(filters.domains)

      if (domainProjectIds.length > 0) {
        // Use normalized matches
        query = query.in('id', domainProjectIds)
      } else {
        // Fallback to legacy category/industry columns
        const legacyFilter = filters.domains
          .map(d => `industry.ilike.%${d}%,sector.ilike.%${d}%,category.cs.{${d}}`)
          .join(',')
        query = query.or(legacyFilter)
      }
    }

    // 6. Technology filter (M:N + legacy tech_stack array fallback)
    if (filters.technologies && filters.technologies.length > 0) {
      const techProjectIds = await this.getProjectIdsByTechnologyNames(filters.technologies)
      if (techProjectIds.length > 0) {
        query = query.in('id', techProjectIds)
      } else {
        const legacyFilter = filters.technologies
          .map(t => `tech_stack.cs.{${t}}`)
          .join(',')
        query = query.or(legacyFilter)
      }
    }

    // 7. Other filters
    if (filters.stages && filters.stages.length > 0) {
      query = query.in('stage', filters.stages)
    }
    if (filters.project_types && filters.project_types.length > 0) {
      query = query.in('project_type', filters.project_types)
    }
    if (filters.locations && filters.locations.length > 0) {
      query = query.or(filters.locations.map(l => `location.ilike.%${l}%`).join(','))
    }
    if (filters.licenses && filters.licenses.length > 0) {
      query = query.in('license', filters.licenses)
    }
    if (filters.is_open_source) query = query.eq('is_open_source', true)
    if (filters.is_verified) query = query.eq('is_dsrt_verified', true)
    if (filters.is_looking_for_collaborators) {
      query = query.eq('collaboration_status', 'looking_for_collaborators')
    }
    if (filters.has_repository) {
      query = query.not('repository_url', 'is', null)
    }

    if (filters.is_newly_launched) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', thirtyDaysAgo)
    }

    // Hiring uses team_up_requests join
    if (filters.is_hiring) {
      const { data: hiringRoles } = await this.supabase
        .from('team_up_requests')
        .select('project_id')
        .eq('status', 'published')
        .not('project_id', 'is', null)

      const hiringProjectIds = [...new Set((hiringRoles || []).map(r => r.project_id))]
      if (hiringProjectIds.length > 0) {
        query = query.in('id', hiringProjectIds)
      } else {
        return { modules: [], nextCursor: null, ranking_version: this.variant }
      }
    }

    // 8. Fetch broad candidate pool
    const { data: rawCandidates, error } = await query
      .order('discovery_rank_seed', { ascending: true })
      .limit(MAX_CANDIDATE_POOL)

    if (error) {
      console.error('[ProjectExploreEngine] Candidate fetch error:', error)
      return { modules: [], nextCursor: null, ranking_version: this.variant }
    }

    if (!rawCandidates || rawCandidates.length === 0) {
      return { modules: [], nextCursor: null, ranking_version: this.variant }
    }

    // 9. Hydrate with taxonomy normalized data
    const projectIds = rawCandidates.map((v: any) => v.id)
    const [domainAssignments, technologyAssignments] = await Promise.all([
      this.getDomainsForProjects(projectIds),
      this.getTechnologiesForProjects(projectIds),
    ])

    const allCandidates: ExploreProjectCard[] = rawCandidates.map((v: any) => {
      const normalizedDomains = domainAssignments.get(v.id) || []
      const legacyCats = v.category || []
      const combined = [...new Set([
        ...normalizedDomains,
        v.industry,
        v.sector,
        ...legacyCats,
      ].filter(Boolean))] as string[]

      return {
        ...v,
        is_following: followedIds.has(v.id),
        is_saved: savedIds.has(v.id),
        domains: combined,
        technologies: technologyAssignments.get(v.id) || v.tech_stack || [],
        primary_domain: normalizedDomains[0] || v.industry || v.sector || null,
      }
    })

    // 10. Rank & build feed
    const sortMode =
      filters.sort ||
      (activeTab === 'all' ? 'recommended' :
       activeTab === 'rising' ? 'rising' :
       activeTab === 'new' ? 'newest' :
       'recommended')

    const rankedAll = this.sortCatalog(allCandidates, sortMode, userAffinities, sessionAffinities)

    // 11. Recycle paging (YouTube-style infinite scroll)
    let pageItems: ExploreProjectCard[]

    if (pageDepth === 0) {
      pageItems = rankedAll.slice(0, PAGE_SIZE)
    } else {
      const seenSet = new Set(seenIds)
      const unseen = rankedAll.filter(v => !seenSet.has(v.id))

      if (unseen.length >= PAGE_SIZE) {
        pageItems = unseen.slice(0, PAGE_SIZE)
      } else {
        const decayed = this.applyRelevanceDecay(rankedAll, pageDepth, seenSet)
        pageItems = [...unseen, ...decayed].slice(0, PAGE_SIZE)
      }
    }

    // 12. Assign reason labels
    pageItems = this.assignReasonLabels(pageItems, activeTab, userAffinities, sessionAffinities)

    // 13. Build cursor for next page
    const newSeenIds = [...seenIds, ...pageItems.map(p => p.id)].slice(-300)
    const nextCursor = this.encodeCursor({ depth: pageDepth + 1, seen: newSeenIds })

    // 14. Build module response
    const moduleTitle = pageDepth === 0 ? this.getModuleTitle(activeTab, filters) : ''
    const moduleSubtitle = pageDepth === 0 ? this.getModuleSubtitle(activeTab) : undefined

    return {
      modules: [{
        id: `feed-${pageDepth}`,
        type: this.mapTabToModuleType(activeTab),
        title: moduleTitle,
        subtitle: moduleSubtitle,
        items: pageItems,
      }],
      nextCursor,
      ranking_version: this.variant,
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // REASON LABEL ASSIGNMENT (contextual, professional — no "AI score")
  // ─────────────────────────────────────────────────────────────────
  private assignReasonLabels(
    items: ExploreProjectCard[],
    activeTab: string,
    affinities: { domain_slug: string; score: number }[],
    sessionAffinities: { domain_slug: string; score: number }[]
  ): ExploreProjectCard[] {
    const affinityMap = new Map(affinities.map(a => [a.domain_slug.toLowerCase(), a.score]))
    const sessionMap = new Map(sessionAffinities.map(a => [a.domain_slug.toLowerCase(), a.score]))

    return items.map(v => {
      let reasonCode: string | undefined
      let reasonLabel: string | undefined

      if (activeTab === 'rising') {
        reasonCode = REASON_CODES.RISING
        reasonLabel = 'Rising momentum'
      } else if (activeTab === 'new') {
        reasonCode = REASON_CODES.NEW_AND_RELEVANT
        reasonLabel = 'Newly created'
      } else {
        // Session intent beats long-term affinity
        const sessMatch = v.domains?.find(d => sessionMap.has(d.toLowerCase()))
        if (sessMatch && (sessionMap.get(sessMatch.toLowerCase()) || 0) > 3) {
          reasonCode = REASON_CODES.SESSION_INTENT
          reasonLabel = 'Based on your recent activity'
        } else {
          const affinityMatch = v.domains?.find(d => affinityMap.has(d.toLowerCase()))
          if (affinityMatch) {
            reasonCode = REASON_CODES.DOMAIN_AFFINITY
            reasonLabel = `Because you explore ${affinityMatch}`
          } else if (v.is_open_source) {
            reasonCode = REASON_CODES.OPEN_SOURCE
            reasonLabel = 'Open source'
          } else if (v.collaboration_status === 'looking_for_collaborators') {
            reasonCode = REASON_CODES.LOOKING_FOR_COLLABORATORS
            reasonLabel = 'Looking for collaborators'
          } else if (v.is_dsrt_verified) {
            reasonCode = REASON_CODES.VERIFIED
            reasonLabel = 'DSRT Verified'
          }
        }
      }

      return { ...v, reason_code: reasonCode, reason_label: reasonLabel }
    })
  }

  // ─────────────────────────────────────────────────────────────────
  // RANKING: MMR-based scoring with domain + tech + session boost
  // ─────────────────────────────────────────────────────────────────
  private rankCandidatesMMR(
    candidates: ExploreProjectCard[],
    affinities: { domain_slug: string; score: number }[],
    sessionAffinities: { domain_slug: string; score: number }[]
  ): ExploreProjectCard[] {

    const affinityMap = new Map(affinities.map(a => [a.domain_slug.toLowerCase(), a.score]))
    const sessionMap = new Map(sessionAffinities.map(a => [a.domain_slug.toLowerCase(), a.score]))

    const isV2 = this.variant === 'project-explore-v2'
    const domainWeight = isV2 ? 4 : 5
    const techWeight = isV2 ? 5 : 4
    const sessionBoostWeight = isV2 ? 12 : 8
    const openSourceWeight = isV2 ? 8 : 6
    const verifiedWeight = 12
    const mmrLambda = isV2 ? 0.65 : 0.75

    // Score each candidate
    const scored = candidates.map(v => {
      let score = 0

      // 1. Long-term domain affinity
      const domScore = (v.domains || [])
        .reduce((acc, d) => acc + (affinityMap.get(d.toLowerCase()) || 0), 0)
      score += domScore * domainWeight

      // 2. Technology affinity (bonus for matching tech user is interested in)
      const techScore = (v.technologies || [])
        .reduce((acc, t) => acc + (affinityMap.get(t.toLowerCase()) || 0), 0)
      score += techScore * techWeight * 0.5  // Tech gets slightly less than domain

      // 3. Session intent boost (much stronger, short-term)
      const sessScore = (v.domains || [])
        .reduce((acc, d) => acc + (sessionMap.get(d.toLowerCase()) || 0), 0)
      score += sessScore * sessionBoostWeight

      // 4. Quality signals
      if (v.is_dsrt_verified) score += verifiedWeight
      if (v.is_open_source) score += openSourceWeight
      if (v.collaboration_status === 'looking_for_collaborators') score += 6
      if (v.repository_url) score += 4

      // 5. Freshness
      const hoursAgo = (Date.now() - new Date(v.last_activity_at || v.created_at || Date.now()).getTime()) / 3600000
      score += Math.max(0, 25 - (hoursAgo / 24))

      // 6. Engagement (log-scaled to prevent dominance)
      const followers = v.follower_count || 0
      const views = v.view_count || 0
      score += Math.log10(followers + 1) * 3
      score += Math.log10(views + 1) * 1.5

      return { ...v, _score: score }
    })

    // MMR diversification: select items that balance relevance and diversity
    const unselected = [...scored].sort((a, b) => (b._score || 0) - (a._score || 0))
    const selected: typeof scored = []

    if (unselected.length > 0) selected.push(unselected.shift()!)

    while (unselected.length > 0 && selected.length < unselected.length + selected.length) {
      let bestIdx = 0
      let bestMMR = -Infinity

      for (let i = 0; i < unselected.length; i++) {
        const candidate = unselected[i]

        // Similarity to already-selected items (domain overlap + tech overlap + stage overlap)
        let maxSim = 0
        for (const s of selected) {
          let sim = 0
          const sharedDomains = candidate.domains?.filter(d => s.domains?.includes(d)) || []
          const sharedTech = candidate.technologies?.filter(t => s.technologies?.includes(t)) || []
          if (sharedDomains.length > 0) sim += 0.5
          if (sharedTech.length > 0) sim += 0.3
          if (candidate.stage === s.stage) sim += 0.15
          if (candidate.project_type === s.project_type) sim += 0.05
          if (sim > maxSim) maxSim = sim
        }

        const mmr = mmrLambda * (candidate._score || 0) - (1 - mmrLambda) * maxSim * 40

        if (mmr > bestMMR) {
          bestMMR = mmr
          bestIdx = i
        }
      }

      selected.push(unselected[bestIdx])
      unselected.splice(bestIdx, 1)

      // Safety limit
      if (selected.length >= MAX_CANDIDATE_POOL) break
    }

    return selected
  }

  // ─────────────────────────────────────────────────────────────────
  // SORT CATALOG (by mode)
  // ─────────────────────────────────────────────────────────────────
  private sortCatalog(
    items: ExploreProjectCard[],
    mode: string,
    affinities: { domain_slug: string; score: number }[],
    sessionAffinities: { domain_slug: string; score: number }[]
  ): ExploreProjectCard[] {

    if (mode === 'newest') {
      return [...items].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
    }
    if (mode === 'updated') {
      return [...items].sort(
        (a, b) => new Date(b.last_activity_at || b.updated_at || 0).getTime()
                - new Date(a.last_activity_at || a.updated_at || 0).getTime()
      )
    }
    if (mode === 'most_followed') {
      return [...items].sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
    }
    if (mode === 'most_active') {
      return [...items].sort((a, b) => {
        const scoreA = (a.follower_count || 0) + (a.view_count || 0) * 0.5 + (a.save_count || 0) * 2
        const scoreB = (b.follower_count || 0) + (b.view_count || 0) * 0.5 + (b.save_count || 0) * 2
        return scoreB - scoreA
      })
    }
    if (mode === 'rising') {
      // Simple growth proxy: recent activity × engagement
      return [...items].sort((a, b) => {
        const daysA = Math.max(1, (Date.now() - new Date(a.created_at || 0).getTime()) / 86400000)
        const daysB = Math.max(1, (Date.now() - new Date(b.created_at || 0).getTime()) / 86400000)
        const engA = (a.follower_count || 0) * 2 + (a.view_count || 0)
        const engB = (b.follower_count || 0) * 2 + (b.view_count || 0)
        return (engB / daysB) - (engA / daysA)
      })
    }

    // Default = personalized MMR ranking
    return this.rankCandidatesMMR(items, affinities, sessionAffinities)
  }

  // ─────────────────────────────────────────────────────────────────
  // RELEVANCE DECAY (for deep infinite scroll)
  // ─────────────────────────────────────────────────────────────────
  private applyRelevanceDecay(
    allRanked: ExploreProjectCard[],
    depth: number,
    seenSet: Set<string>
  ): ExploreProjectCard[] {
    const decayFactor = Math.max(0.3, 1 - depth * 0.12)

    return allRanked
      .map(v => ({
        ...v,
        _score: (v._score || 0) * decayFactor + Math.random() * (1 - decayFactor) * 20,
      }))
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .filter(v => !seenSet.has(v.id))
  }

  // ─────────────────────────────────────────────────────────────────
  // HELPERS: MODULE METADATA
  // ─────────────────────────────────────────────────────────────────
  private getModuleTitle(activeTab: string, filters: ExploreProjectFilterState): string {
    if (filters.search) return `Results for "${filters.search}"`
    if (activeTab === 'rising') return 'Rising projects'
    if (activeTab === 'new') return 'New projects'
    if (activeTab === 'all') return 'All projects'
    if (activeTab === 'following') return 'Projects you follow'
    return 'Recommended for you'
  }

  private getModuleSubtitle(activeTab: string): string | undefined {
    if (activeTab === 'rising') return 'Projects gaining momentum right now'
    if (activeTab === 'new') return 'Recently launched on DSRT'
    if (activeTab === 'recommended') return 'Curated based on your technical interests'
    if (activeTab === 'following') return 'Projects you actively follow'
    return undefined
  }

  private mapTabToModuleType(tab: string): ExploreProjectModule['type'] {
    if (tab === 'rising') return 'rising'
    if (tab === 'new') return 'new_and_notable'
    if (tab === 'all') return 'catalog'
    if (tab === 'following') return 'following'
    return 'recommended'
  }

  // ─────────────────────────────────────────────────────────────────
  // TAXONOMY HYDRATION
  // ─────────────────────────────────────────────────────────────────
  private async getDomainsForProjects(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map()

    const { data } = await this.supabase
      .from('project_domain_assignments')
      .select('project_id, domain:project_domains_taxonomy(name, slug)')
      .in('project_id', projectIds)

    const map = new Map<string, string[]>()
    for (const row of (data || []) as any[]) {
      const name = row.domain?.name
      if (!name) continue
      const existing = map.get(row.project_id) || []
      existing.push(name)
      map.set(row.project_id, existing)
    }
    return map
  }

  private async getTechnologiesForProjects(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map()

    const { data } = await this.supabase
      .from('project_technology_assignments')
      .select('project_id, technology:project_technologies_taxonomy(name, slug)')
      .in('project_id', projectIds)

    const map = new Map<string, string[]>()
    for (const row of (data || []) as any[]) {
      const name = row.technology?.name
      if (!name) continue
      const existing = map.get(row.project_id) || []
      existing.push(name)
      map.set(row.project_id, existing)
    }
    return map
  }

  private async getProjectIdsByDomainNames(domainNames: string[]): Promise<string[]> {
    if (domainNames.length === 0) return []

    const { data: domains } = await this.supabase
      .from('project_domains_taxonomy')
      .select('id')
      .in('name', domainNames)

    const domainIds = (domains || []).map((d: any) => d.id)
    if (domainIds.length === 0) return []

    const { data: assignments } = await this.supabase
      .from('project_domain_assignments')
      .select('project_id')
      .in('domain_id', domainIds)

    return [...new Set((assignments || []).map((a: any) => a.project_id))]
  }

  private async getProjectIdsByTechnologyNames(techNames: string[]): Promise<string[]> {
    if (techNames.length === 0) return []

    const { data: technologies } = await this.supabase
      .from('project_technologies_taxonomy')
      .select('id')
      .in('name', techNames)

    const techIds = (technologies || []).map((t: any) => t.id)
    if (techIds.length === 0) return []

    const { data: assignments } = await this.supabase
      .from('project_technology_assignments')
      .select('project_id')
      .in('technology_id', techIds)

    return [...new Set((assignments || []).map((a: any) => a.project_id))]
  }

  // ─────────────────────────────────────────────────────────────────
  // USER STATE FETCHERS
  // ─────────────────────────────────────────────────────────────────
  private async getNegativeProjectIds(): Promise<string[]> {
    if (!this.userId) return []
    const { data } = await this.supabase
      .from('project_explore_negative_signals')
      .select('project_id')
      .eq('user_id', this.userId)
    return (data || []).map((r: any) => r.project_id)
  }

  private async getUserDomainAffinities(): Promise<{ domain_slug: string; score: number }[]> {
    if (!this.userId) return []
    const { data } = await this.supabase
      .from('user_project_domain_affinity')
      .select('domain_slug, score')
      .eq('user_id', this.userId)
      .order('score', { ascending: false })
      .limit(30)
    return data || []
  }

  private async getSessionAffinities(): Promise<{ domain_slug: string; score: number }[]> {
    if (!this.sessionId) return []
    const { data } = await this.supabase
      .from('project_explore_interactions')
      .select('domain_slugs, weight')
      .eq('session_id', this.sessionId)
      .gt('created_at', new Date(Date.now() - 2 * 3600000).toISOString())

    if (!data) return []
    const agg = new Map<string, number>()
    for (const r of data) {
      for (const d of (r.domain_slugs || [])) {
        const k = d.toLowerCase()
        agg.set(k, (agg.get(k) || 0) + (r.weight || 1))
      }
    }
    return Array.from(agg.entries())
      .map(([domain_slug, score]) => ({ domain_slug, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  private async getFollowedProjectIds(): Promise<Set<string>> {
    if (!this.userId) return new Set()
    const { data } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', this.userId)
      .eq('following_type', 'project')
    return new Set((data || []).map((r: any) => r.following_id))
  }

  private async getSavedProjectIds(): Promise<Set<string>> {
    if (!this.userId) return new Set()
    const { data } = await this.supabase
      .from('project_saves')
      .select('project_id')
      .eq('user_id', this.userId)
    return new Set((data || []).map((r: any) => r.project_id))
  }

  // ─────────────────────────────────────────────────────────────────
  // CURSORS
  // ─────────────────────────────────────────────────────────────────
  private parseCursor(cursor?: string): { depth: number; seen: string[] } | null {
    if (!cursor) return null
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'))
      return { depth: decoded.depth || 0, seen: decoded.seen || [] }
    } catch {
      return null
    }
  }

  private encodeCursor(data: { depth: number; seen: string[] }): string {
    return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64')
  }
}