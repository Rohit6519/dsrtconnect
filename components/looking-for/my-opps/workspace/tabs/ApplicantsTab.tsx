'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApplicationsFilters, type ApplicationFilters } from '@/components/looking-for/my-opps/applications/ApplicationsFilters'
import { ApplicationsTable } from '@/components/looking-for/my-opps/applications/ApplicationsTable'
import { ApplicationsBulkBar } from '@/components/looking-for/my-opps/applications/ApplicationsBulkBar'
import { ApplicantSidePanel } from '@/components/looking-for/my-opps/applications/ApplicantSidePanel'

export function ApplicantsTab({ opportunityId }: { opportunityId: string }) {
  const [filters, setFilters] = useState<ApplicationFilters>({
    q: '', stage: 'all', opportunity_id: opportunityId,
    reviewer: '', verified: '', days: '', skills: '', sort: 'newest',
  })
  const [rows, setRows] = useState<any[] | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeAppId, setActiveAppId] = useState<string | null>(null)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('opportunity_id', opportunityId)
    if (filters.q) p.set('q', filters.q)
    if (filters.stage !== 'all') p.set('stage', filters.stage)
    if (filters.reviewer) p.set('reviewer', filters.reviewer)
    if (filters.verified) p.set('verified', filters.verified)
    if (filters.days) p.set('days', filters.days)
    if (filters.skills) p.set('skills', filters.skills)
    if (filters.sort) p.set('sort', filters.sort)
    p.set('limit', '30')
    return p.toString()
  }, [filters, opportunityId])

  const load = useCallback(async () => {
    const res = await fetch(`/api/opportunities/applications?${qs}`)
    const d = await res.json()
    setRows(d.applications || [])
    setStats(d.stats || null)
    setNextCursor(d.next_cursor || null)
    setSelected(new Set())
  }, [qs])

  useEffect(() => { load() }, [load])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const res = await fetch(`/api/opportunities/applications?${qs}&cursor=${encodeURIComponent(nextCursor)}`)
    const d = await res.json()
    setRows(prev => [...(prev || []), ...(d.applications || [])])
    setNextCursor(d.next_cursor || null)
    setLoadingMore(false)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
      <div className="min-w-0 space-y-4">
        <ApplicationsFilters
          value={{ ...filters, opportunity_id: opportunityId }}
          onChange={(v) => setFilters({ ...v, opportunity_id: opportunityId })}
          stats={stats}
        />

        {rows === null ? (
          <div className="space-y-2">
            {[0,1,2,3].map(i => <div key={i} className="h-16 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-[12.5px] text-zinc-500">
            No applicants match these filters.
          </div>
        ) : (
          <>
            <ApplicationsTable
              rows={rows}
              selected={selected}
              onToggleOne={(id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })}
              onToggleAll={() => setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))}
              onOpen={setActiveAppId}
              activeAppId={activeAppId}
              filters={{ ...filters, opportunity_id: opportunityId }}
              onChangeFilters={setFilters}
            />
            {nextCursor && (
              <div className="flex justify-center py-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-9 px-4 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-300 hover:text-white disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

        <ApplicationsBulkBar
          selectedIds={Array.from(selected)}
          onClear={() => setSelected(new Set())}
          onDone={load}
        />
      </div>

      <div className="min-w-0">
        <ApplicantSidePanel
          appId={activeAppId}
          onClose={() => setActiveAppId(null)}
          onChanged={load}
        />
      </div>
    </div>
  )
}