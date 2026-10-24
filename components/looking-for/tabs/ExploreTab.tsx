'use client'

import { useEffect, useState, useCallback } from 'react'
import { CategoryBar } from '../CategoryBar'
import { SearchToolbar } from '../SearchToolbar'
import { RequestCard } from '../RequestCard'
import { EmptyState } from '../EmptyState'
import { CardSkeletonGrid } from '../CardSkeleton'
import { FiltersDrawer } from '../FiltersDrawer'
import type { TeamUpItem, TeamUpFilters } from '@/types/teamup'

export function ExploreTab() {
  const [items, setItems] = useState<TeamUpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TeamUpFilters>({ type: 'all', sort: 'best_match' })
  const [total, setTotal] = useState(0)

  const load = useCallback(async (currentFilters: TeamUpFilters) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (currentFilters.type && currentFilters.type !== 'all') params.set('type', currentFilters.type)
      if (currentFilters.skills?.length) params.set('skills', currentFilters.skills.join(','))
      if (currentFilters.industry) params.set('industry', currentFilters.industry)
      if (currentFilters.commitment) params.set('commitment', currentFilters.commitment)
      if (currentFilters.work_mode) params.set('work_mode', currentFilters.work_mode)
      if (currentFilters.experience) params.set('experience', currentFilters.experience)
      if (currentFilters.location) params.set('location', currentFilters.location)
      if (currentFilters.status) params.set('status', currentFilters.status)
      if (currentFilters.q) params.set('q', currentFilters.q)
      if (currentFilters.sort) params.set('sort', currentFilters.sort)
      params.set('limit', '30')

      const res = await fetch(`/api/looking-for?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filters)
  }, [filters, load])

  const activeFilterCount = [
    filters.skills?.length ? 1 : 0,
    filters.industry ? 1 : 0,
    filters.commitment ? 1 : 0,
    filters.work_mode ? 1 : 0,
    filters.experience ? 1 : 0,
    filters.location ? 1 : 0,
    filters.status ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const addSkill = (name: string) => {
    setFilters(f => {
      const cur = f.skills || []
      if (cur.includes(name)) return f
      return { ...f, skills: [...cur, name] }
    })
  }

  return (
    <div className="space-y-6">
      <CategoryBar
        active={filters.type || 'all'}
        onChange={(key) => setFilters(f => ({ ...f, type: key }))}
      />

      <SearchToolbar
        q={filters.q || ''}
        onQueryChange={(q) => setFilters(f => ({ ...f, q }))}
        onOpenFilters={() => setShowFilters(true)}
        activeFilterCount={activeFilterCount}
        sort={filters.sort}
        onSortChange={(sort) => setFilters(f => ({ ...f, sort: sort as any }))}
        onAddSkill={addSkill}
      />

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.skills?.map(s => (
            <ActiveChip key={`sk-${s}`} label={s} onRemove={() => setFilters(f => ({ ...f, skills: (f.skills || []).filter(x => x !== s) }))} />
          ))}
          {filters.industry && <ActiveChip label={`Industry: ${filters.industry}`} onRemove={() => setFilters(f => ({ ...f, industry: undefined }))} />}
          {filters.commitment && <ActiveChip label={filters.commitment} onRemove={() => setFilters(f => ({ ...f, commitment: undefined }))} />}
          {filters.work_mode && <ActiveChip label={filters.work_mode} onRemove={() => setFilters(f => ({ ...f, work_mode: undefined }))} />}
          {filters.experience && <ActiveChip label={filters.experience} onRemove={() => setFilters(f => ({ ...f, experience: undefined }))} />}
          {filters.location && <ActiveChip label={filters.location} onRemove={() => setFilters(f => ({ ...f, location: undefined }))} />}
          {filters.status && <ActiveChip label={filters.status} onRemove={() => setFilters(f => ({ ...f, status: undefined }))} />}
          <button
            onClick={() => setFilters({ type: filters.type, sort: filters.sort })}
            className="text-[12px] text-zinc-500 hover:text-zinc-200 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="text-[13px] text-zinc-500 font-medium">
          {total} {total === 1 ? 'opportunity' : 'opportunities'}
        </div>
      )}

      {loading ? (
        <CardSkeletonGrid count={6} />
      ) : error ? (
        <EmptyState title="Couldn't load opportunities" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title={filters.q || activeFilterCount > 0 ? 'No matching opportunities' : 'No opportunities yet'}
          description={
            filters.q || activeFilterCount > 0
              ? 'Try adjusting your search or filters.'
              : 'Be among the first to post a team-up request.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.map(item => (
            <RequestCard key={`${item.source_type}-${item.source_id}`} item={item} />
          ))}
        </div>
      )}

      {showFilters && (
        <FiltersDrawer
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-7 pl-3 pr-1 rounded-md bg-zinc-900 border border-zinc-800 text-[12px] font-medium text-zinc-200">
      <span className="capitalize">{label.replace(/_/g, ' ')}</span>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800"
      >
        <span className="text-[13px] leading-none">×</span>
      </button>
    </span>
  )
}
