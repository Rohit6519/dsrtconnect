// filepath: components/looking-for/v2/LookingForPageV2.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FunnelSimple } from '@phosphor-icons/react'
import { LookingForHeader } from './LookingForHeader'
import { SearchBar } from './SearchBar'
import { LookingForTabs, type TabId } from './LookingForTabs'
import { FiltersPanel, type FilterState } from './FiltersPanel'
import { OpportunityFeed } from './OpportunityFeed'
import { SortDropdown } from './SortDropdown'
import { CompactBanners } from './CompactBanners'
import { LookingForResourcesMarquee } from './LookingForResourcesMarquee'
import { ApplicationsTab } from './tabs/ApplicationsTab'
import { SavedTab } from './tabs/SavedTab'
import { SuggestedTab } from './tabs/SuggestedTab'
import { PeopleTab } from './tabs/PeopleTab'
import { CategoriesTab } from './tabs/CategoriesTab'
import { DsrtLayoutWithRail, DsrtSheet, DsrtButton } from '@/components/dsrt'

export function LookingForPageV2() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') as TabId
  const validTab = ['explore', 'applications', 'saved', 'suggested', 'people', 'categories'].includes(initialTab)
    ? initialTab
    : 'explore'

  const [activeTab, setActiveTab] = useState<TabId>(validTab)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recommended')
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    category: null,
    subcategory: null,
    type: null,
    experience: null,
    compensation: null,
    work_mode: null,
    location: null,
    time_commitment: null,
    project_length: null,
    post_age: null,
    skills: [],
    min_budget: null,
    max_budget: null,
  })

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.replace(`/looking-for?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const goCreate = useCallback(() => router.push('/looking-for/create'), [router])

  const handleCountChange = useCallback((count: number, isLoading: boolean) => {
    setTotalCount(count)
    setFeedLoading(isLoading)
  }, [])

  const isExplore = activeTab === 'explore'

  const activeFilterCount =
    [
      filters.category,
      filters.type,
      filters.experience,
      filters.compensation,
      filters.work_mode,
      filters.location,
      filters.time_commitment,
      filters.project_length,
      filters.post_age,
    ].filter(Boolean).length + (filters.skills.length > 0 ? 1 : 0)

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-6">
      <LookingForHeader onCreate={goCreate} />

      <CompactBanners />
      <SearchBar value={query} onChange={setQuery} />

      <div className="sticky top-[64px] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 md:mx-0 md:px-0 py-1.5 border-b border-white/[0.06]">
        <LookingForTabs active={activeTab} onChange={handleTabChange} />
      </div>

      {isExplore ? (
        <div className="space-y-8">
          <DsrtLayoutWithRail
            railPosition="left"
            railBreakpoint="lg"
            rail={<FiltersPanel filters={filters} onChange={setFilters} />}
          >
            <div className="space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[13px] text-white/50 font-medium">
                  {feedLoading
                    ? 'Loading opportunities…'
                    : totalCount !== null
                    ? `${totalCount.toLocaleString()} ${
                        totalCount === 1 ? 'opportunity' : 'opportunities'
                      } found`
                    : 'Opportunities'}
                </p>

                <div className="flex items-center gap-2">
                  <SortDropdown value={sort} onChange={setSort} />
                  <DsrtButton
                    size="sm"
                    variant="outline"
                    className="lg:hidden"
                    onClick={() => setMobileFiltersOpen(true)}
                  >
                    <FunnelSimple size={14} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </DsrtButton>
                </div>
              </div>

              <OpportunityFeed
                query={query}
                filters={filters}
                sort={sort}
                tab={activeTab}
                onCountChange={handleCountChange}
              />
            </div>
          </DsrtLayoutWithRail>

          <LookingForResourcesMarquee />
        </div>
      ) : (
        <div className="min-h-[40vh]">
          {activeTab === 'applications' && <ApplicationsTab />}
          {activeTab === 'saved' && <SavedTab />}
          {activeTab === 'suggested' && <SuggestedTab />}
          {activeTab === 'people' && <PeopleTab />}
          {activeTab === 'categories' && (
            <CategoriesTab
              onCategoryPick={(slug: string) => {
                setActiveTab('explore')
                setFilters((f) => ({ ...f, category: slug }))
              }}
            />
          )}
        </div>
      )}

      <DsrtSheet
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        title="Filters"
        snap="full"
      >
        <FiltersPanel filters={filters} onChange={setFilters} />
        <div className="pt-4">
          <DsrtButton fullWidth variant="primary" onClick={() => setMobileFiltersOpen(false)}>
            Apply filters
          </DsrtButton>
        </div>
      </DsrtSheet>
    </div>
  )
}