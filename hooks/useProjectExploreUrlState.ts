'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ExploreProjectFilterState } from '@/lib/project-explore/types'

/**
 * Bidirectional sync between URL query params and project filter state.
 * Enables: shareable URLs, browser back/forward, refresh persistence.
 */
export function useProjectExploreUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: ExploreProjectFilterState = useMemo(() => {
    const parseArr = (key: string): string[] => {
      const v = searchParams.get(key)
      return v ? v.split(',').filter(Boolean) : []
    }

    return {
      search: searchParams.get('q') || '',
      domains: parseArr('domain'),
      technologies: parseArr('tech'),
      stages: parseArr('stage'),
      project_types: parseArr('ptype'),
      locations: parseArr('location'),
      licenses: parseArr('license'),
      is_open_source: searchParams.get('oss') === '1',
      is_hiring: searchParams.get('hiring') === '1',
      is_looking_for_collaborators: searchParams.get('collab') === '1',
      is_verified: searchParams.get('verified') === '1',
      is_newly_launched: searchParams.get('fresh') === '1',
      has_repository: searchParams.get('repo') === '1',
      sort: (searchParams.get('sort') as any) || 'recommended',
    }
  }, [searchParams])

  const activeTab = (searchParams.get('ptab') as any) || 'recommended'

  const setFilters = useCallback((newFilters: ExploreProjectFilterState) => {
    const params = new URLSearchParams()

    if (newFilters.search) params.set('q', newFilters.search)
    if (newFilters.domains?.length) params.set('domain', newFilters.domains.join(','))
    if (newFilters.technologies?.length) params.set('tech', newFilters.technologies.join(','))
    if (newFilters.stages?.length) params.set('stage', newFilters.stages.join(','))
    if (newFilters.project_types?.length) params.set('ptype', newFilters.project_types.join(','))
    if (newFilters.locations?.length) params.set('location', newFilters.locations.join(','))
    if (newFilters.licenses?.length) params.set('license', newFilters.licenses.join(','))
    if (newFilters.is_open_source) params.set('oss', '1')
    if (newFilters.is_hiring) params.set('hiring', '1')
    if (newFilters.is_looking_for_collaborators) params.set('collab', '1')
    if (newFilters.is_verified) params.set('verified', '1')
    if (newFilters.is_newly_launched) params.set('fresh', '1')
    if (newFilters.has_repository) params.set('repo', '1')
    if (newFilters.sort && newFilters.sort !== 'recommended') params.set('sort', newFilters.sort)

    // Preserve outer tabs
    const outerTab = searchParams.get('tab')
    const ptab = searchParams.get('ptab')
    if (outerTab) params.set('tab', outerTab)
    if (ptab) params.set('ptab', ptab)

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const setActiveTab = useCallback((tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('ptab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams()
    const outerTab = searchParams.get('tab')
    const ptab = searchParams.get('ptab')
    if (outerTab) params.set('tab', outerTab)
    if (ptab) params.set('ptab', ptab)
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  return { filters, activeTab, setFilters, setActiveTab, clearFilters }
}