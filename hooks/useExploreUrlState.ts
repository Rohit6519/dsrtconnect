'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ExploreFilterState } from '@/lib/venture-explore/types'

export function useExploreUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: ExploreFilterState = useMemo(() => {
    const parseArr = (key: string): string[] => {
      const v = searchParams.get(key)
      return v ? v.split(',').filter(Boolean) : []
    }

    return {
      search: searchParams.get('q') || '',
      domains: parseArr('domain'),
      sub_categories: parseArr('subcat'),
      stages: parseArr('stage'),
      locations: parseArr('location'),
      venture_types: parseArr('type'),
      business_models: parseArr('model'),
      team_sizes: parseArr('team'),
      funding_stages: parseArr('funding'),
      is_verified: searchParams.get('verified') === '1',
      is_hiring: searchParams.get('hiring') === '1',
      is_seeking_investment: searchParams.get('investment') === '1',
      is_seeking_cofounder: searchParams.get('cofounder') === '1',
      is_active_recently: searchParams.get('active') === '1',
      is_newly_launched: searchParams.get('fresh') === '1',
      sort: (searchParams.get('sort') as any) || 'recommended',
    }
  }, [searchParams])

  const activeTab = (searchParams.get('vtab') as any) || 'recommended'

  const setFilters = useCallback((newFilters: ExploreFilterState) => {
    const params = new URLSearchParams()

    if (newFilters.search) params.set('q', newFilters.search)
    if (newFilters.domains?.length) params.set('domain', newFilters.domains.join(','))
    if (newFilters.sub_categories?.length) params.set('subcat', newFilters.sub_categories.join(','))
    if (newFilters.stages?.length) params.set('stage', newFilters.stages.join(','))
    if (newFilters.locations?.length) params.set('location', newFilters.locations.join(','))
    if (newFilters.venture_types?.length) params.set('type', newFilters.venture_types.join(','))
    if (newFilters.business_models?.length) params.set('model', newFilters.business_models.join(','))
    if (newFilters.team_sizes?.length) params.set('team', newFilters.team_sizes.join(','))
    if (newFilters.funding_stages?.length) params.set('funding', newFilters.funding_stages.join(','))
    if (newFilters.is_verified) params.set('verified', '1')
    if (newFilters.is_hiring) params.set('hiring', '1')
    if (newFilters.is_seeking_investment) params.set('investment', '1')
    if (newFilters.is_seeking_cofounder) params.set('cofounder', '1')
    if (newFilters.is_active_recently) params.set('active', '1')
    if (newFilters.is_newly_launched) params.set('fresh', '1')
    if (newFilters.sort && newFilters.sort !== 'recommended') params.set('sort', newFilters.sort)

    const outerTab = searchParams.get('tab')
    const vtab = searchParams.get('vtab')
    if (outerTab) params.set('tab', outerTab)
    if (vtab) params.set('vtab', vtab)

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const setActiveTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('vtab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams()
    const outerTab = searchParams.get('tab')
    const vtab = searchParams.get('vtab')
    if (outerTab) params.set('tab', outerTab)
    if (vtab) params.set('vtab', vtab)
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  return { filters, activeTab, setFilters, setActiveTab, clearFilters }
}