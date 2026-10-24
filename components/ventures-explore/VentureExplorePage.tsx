'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MagnifyingGlass, Compass, X, FunnelSimple } from '@phosphor-icons/react'
import { FeaturedCarousel } from './FeaturedCarousel'
import { FilterSidebar } from './FilterSidebar'
import { VentureCard } from './VentureCard'
import { MobileFilterDrawer } from './MobileFilterDrawer'
import { SortDropdown } from './SortDropdown'
import { useExploreUrlState } from '@/hooks/useExploreUrlState'
import { useInfiniteFeed } from '@/hooks/useInfiniteFeed'
import { getAffinityLearner } from '@/lib/venture-explore/affinity-learner'
import { DsrtSection, DsrtInput, DsrtButton, DsrtTabs, DsrtEmpty, DsrtCardSkeleton, DsrtChip, DsrtLayoutWithRail } from '@/components/dsrt'

const DISCOVERY_TABS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'all', label: 'All Ventures' },
  { value: 'rising', label: 'Rising' },
  { value: 'new', label: 'New' },
]

export function VentureExplorePage() {
  const { filters, activeTab, setFilters, setActiveTab, clearFilters } = useExploreUrlState()
  const [banners, setBanners] = useState<any[]>([])
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    setSearchInput(filters.search || '')
  }, [filters.search])

  useEffect(() => {
    fetch('/api/ventures/explore/banners')
      .then(r => r.json())
      .then(d => setBanners(d.banners || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const flush = () => getAffinityLearner().flushImmediate()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const fetcher = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams()

    const sid = typeof window !== 'undefined' ? sessionStorage.getItem('dsrt_explore_session') : null
    if (sid) params.set('session_id', sid)

    if (filters.search) params.set('q', filters.search)
    if (filters.domains?.length) params.set('domain', filters.domains.join(','))
    if (filters.stages?.length) params.set('stage', filters.stages.join(','))
    if (filters.locations?.length) params.set('location', filters.locations.join(','))
    if (filters.venture_types?.length) params.set('type', filters.venture_types.join(','))
    if (filters.business_models?.length) params.set('model', filters.business_models.join(','))
    if (filters.team_sizes?.length) params.set('team', filters.team_sizes.join(','))
    if (filters.funding_stages?.length) params.set('funding', filters.funding_stages.join(','))
    if (filters.is_verified) params.set('verified', '1')
    if (filters.is_hiring) params.set('hiring', '1')
    if (filters.is_seeking_investment) params.set('investment', '1')
    if (filters.is_seeking_cofounder) params.set('cofounder', '1')
    if (filters.is_newly_launched) params.set('fresh', '1')
    if (filters.sort && filters.sort !== 'recommended') params.set('sort', filters.sort)
    params.set('vtab', activeTab)
    if (cursor) params.set('cursor', cursor)

    const res = await fetch(`/api/ventures/explore/feed?${params.toString()}`)
    if (!res.ok) throw new Error('Failed to load feed')
    return await res.json()
  }, [filters, activeTab])

  const { modules, loading, loadingMore, error, sentinelRef, removeItem } = useInfiniteFeed({
    fetcher,
    deps: [
      filters.search, filters.domains?.join(','), filters.stages?.join(','), filters.locations?.join(','),
      filters.venture_types?.join(','), filters.business_models?.join(','), filters.team_sizes?.join(','),
      filters.funding_stages?.join(','), filters.is_verified, filters.is_hiring,
      filters.is_seeking_investment, filters.is_seeking_cofounder, filters.is_newly_launched,
      filters.sort, activeTab,
    ]
  })

  const executeSearch = () => setFilters({ ...filters, search: searchInput })
  const clearSearch = () => { setSearchInput(''); setFilters({ ...filters, search: '' }) }

  const isFiltered = !!(
    filters.search || filters.domains?.length || filters.stages?.length || filters.locations?.length ||
    filters.venture_types?.length || filters.business_models?.length || filters.team_sizes?.length ||
    filters.funding_stages?.length || filters.is_verified || filters.is_hiring ||
    filters.is_seeking_investment || filters.is_seeking_cofounder || filters.is_newly_launched
  )

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; remove: () => void }[] = []
    ;(filters.domains || []).forEach(d => chips.push({ label: d, remove: () => setFilters({ ...filters, domains: filters.domains?.filter(x => x !== d) }) }))
    ;(filters.stages || []).forEach(s => chips.push({ label: s, remove: () => setFilters({ ...filters, stages: filters.stages?.filter(x => x !== s) }) }))
    ;(filters.locations || []).forEach(l => chips.push({ label: l, remove: () => setFilters({ ...filters, locations: filters.locations?.filter(x => x !== l) }) }))
    ;(filters.venture_types || []).forEach(t => chips.push({ label: t, remove: () => setFilters({ ...filters, venture_types: filters.venture_types?.filter(x => x !== t) }) }))
    ;(filters.business_models || []).forEach(m => chips.push({ label: m, remove: () => setFilters({ ...filters, business_models: filters.business_models?.filter(x => x !== m) }) }))
    ;(filters.team_sizes || []).forEach(t => chips.push({ label: `Team: ${t}`, remove: () => setFilters({ ...filters, team_sizes: filters.team_sizes?.filter(x => x !== t) }) }))
    ;(filters.funding_stages || []).forEach(f => chips.push({ label: f, remove: () => setFilters({ ...filters, funding_stages: filters.funding_stages?.filter(x => x !== f) }) }))
    if (filters.is_verified) chips.push({ label: 'Verified', remove: () => setFilters({ ...filters, is_verified: false }) })
    if (filters.is_hiring) chips.push({ label: 'Hiring', remove: () => setFilters({ ...filters, is_hiring: false }) })
    if (filters.is_seeking_investment) chips.push({ label: 'Seeking Investment', remove: () => setFilters({ ...filters, is_seeking_investment: false }) })
    if (filters.is_seeking_cofounder) chips.push({ label: 'Seeking Co-founder', remove: () => setFilters({ ...filters, is_seeking_cofounder: false }) })
    if (filters.is_newly_launched) chips.push({ label: 'Newly Launched', remove: () => setFilters({ ...filters, is_newly_launched: false }) })
    return chips
  }, [filters, setFilters])

  const primaryModule = modules[0]

  return (
    <div className="space-y-6 px-4 md:px-6">
      <DsrtSection
        title="Explore Ventures"
        description="Discover companies, products, builders and ideas shaping tomorrow."
      >
        <div className="space-y-4">
          <DsrtInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
            placeholder="Search ventures, founders, industries, products..."
            icon={<MagnifyingGlass size={16} />}
            sizeVariant="lg"
            rightSlot={
              <div className="flex items-center gap-1">
                {searchInput && (
                  <button onClick={clearSearch} className="p-1 text-white/40 hover:text-white">
                    <X size={14} />
                  </button>
                )}
                <DsrtButton size="xs" variant="primary" onClick={executeSearch}>Search</DsrtButton>
              </div>
            }
          />

          {activeFilterChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Active:</span>
              {activeFilterChips.map((chip, i) => (
                <DsrtChip key={i} onRemove={chip.remove} tone="accent" size="sm">{chip.label}</DsrtChip>
              ))}
              <button onClick={clearFilters} className="text-[11px] font-mono text-white/50 hover:text-white underline ml-1">
                Clear all
              </button>
            </div>
          )}

          {activeTab === 'recommended' && !isFiltered && (
            <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
              <FeaturedCarousel banners={banners} />
            </div>
          )}
        </div>
      </DsrtSection>

      <DsrtLayoutWithRail
        railPosition="left"
        railBreakpoint="lg"
        rail={
          <FilterSidebar
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={clearFilters}
          />
        }
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-white tracking-tight">
                {primaryModule?.title || 'Recommended for you'}
              </h3>
              {primaryModule?.subtitle && (
                <p className="text-[12px] text-white/50 mt-0.5">{primaryModule.subtitle}</p>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
              <DsrtTabs
                variant="segmented"
                tabs={DISCOVERY_TABS}
                activeValue={activeTab}
                onValueChange={(val) => setActiveTab(val)}
              />

              <div className="flex items-center gap-2">
                <SortDropdown
                  value={filters.sort || 'recommended'}
                  onChange={(v) => setFilters({ ...filters, sort: v as any })}
                />
                <DsrtButton
                  size="sm"
                  variant="outline"
                  className="lg:hidden"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <FunnelSimple size={14} />
                  Filters
                  {activeFilterChips.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                      {activeFilterChips.length}
                    </span>
                  )}
                </DsrtButton>
              </div>
            </div>
          </div>

          {loading ? (
            <DsrtCardSkeleton count={6} />
          ) : error ? (
            <DsrtEmpty title="Something went wrong" description={error} />
          ) : modules.length === 0 || modules.every(m => m.items.length === 0) ? (
            <DsrtEmpty
              icon={Compass}
              title="No ventures match these filters"
              description="Try broadening your criteria."
              action={<DsrtButton variant="outline" onClick={clearFilters}>Clear all filters</DsrtButton>}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.flatMap(m => m.items).map((venture, idx) => (
                  <VentureCard
                    key={`${venture.id}-${idx}`}
                    venture={venture}
                    position={idx}
                    moduleType={modules[0]?.type}
                    onNotInterested={removeItem}
                  />
                ))}
              </div>

              <div ref={sentinelRef} className="py-8 flex items-center justify-center min-h-[60px]">
                {loadingMore && (
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Discovering more ventures...
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </DsrtLayoutWithRail>

      <MobileFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={clearFilters}
        activeCount={activeFilterChips.length}
      />
    </div>
  )
}