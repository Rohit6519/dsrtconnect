'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ApplicationsFilters, type ApplicationFilters } from './ApplicationsFilters'
import { ApplicationsTable } from './ApplicationsTable'
import { ApplicationsBulkBar } from './ApplicationsBulkBar'
import { ApplicantSidePanel } from './ApplicantSidePanel'

export function ApplicationsPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const initial: ApplicationFilters = useMemo(() => ({
    q: sp.get('q') || '',
    stage: sp.get('stage') || 'all',
    opportunity_id: sp.get('opportunity_id') || '',
    reviewer: sp.get('reviewer') || '',
    verified: sp.get('verified') || '',
    days: sp.get('days') || '',
    skills: sp.get('skills') || '',
    sort: sp.get('sort') || 'newest',
  }), [sp])

  const [filters, setFilters] = useState<ApplicationFilters>(initial)
  const [rows, setRows] = useState<any[] | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectedAppId, setSelectedAppId] = useState<string | null>(sp.get('app') || null)
  const abortRef = useRef<AbortController | null>(null)

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.stage !== 'all') p.set('stage', filters.stage)
    if (filters.opportunity_id) p.set('opportunity_id', filters.opportunity_id)
    if (filters.reviewer) p.set('reviewer', filters.reviewer)
    if (filters.verified) p.set('verified', filters.verified)
    if (filters.days) p.set('days', filters.days)
    if (filters.skills) p.set('skills', filters.skills)
    if (filters.sort !== 'newest') p.set('sort', filters.sort)
    if (selectedAppId) p.set('app', selectedAppId)
    const qs = p.toString()
    router.replace(`/looking-for/my-opportunities/applications${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [filters, selectedAppId, router])

  const buildQS = useCallback((cursor?: string | null) => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.stage !== 'all') p.set('stage', filters.stage)
    if (filters.opportunity_id) p.set('opportunity_id', filters.opportunity_id)
    if (filters.reviewer) p.set('reviewer', filters.reviewer)
    if (filters.verified) p.set('verified', filters.verified)
    if (filters.days) p.set('days', filters.days)
    if (filters.skills) p.set('skills', filters.skills)
    if (filters.sort) p.set('sort', filters.sort)
    if (cursor) p.set('cursor', cursor)
    p.set('limit', '30')
    return p.toString()
  }, [filters])

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    setRows(null)
    try {
      const res = await fetch(`/api/opportunities/applications?${buildQS()}`, { signal: ac.signal })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setRows(data.applications || [])
      setStats(data.stats || null)
      setNextCursor(data.next_cursor || null)
      setSelected(new Set())
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Failed')
    }
  }, [buildQS])

  useEffect(() => { load() }, [load])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/opportunities/applications?${buildQS(nextCursor)}`)
      const data = await res.json()
      setRows(prev => [...(prev || []), ...(data.applications || [])])
      setNextCursor(data.next_cursor || null)
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  const toggleAll = () => {
    if (!rows) return
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
      <div className="min-w-0 space-y-4">
        <ApplicationsFilters value={filters} onChange={setFilters} stats={stats} />

        {error && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4 text-[13px] text-red-300">
            {error}
          </div>
        )}

        {rows === null ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ApplicationsTable
              rows={rows}
              selected={selected}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              onOpen={setSelectedAppId}
              activeAppId={selectedAppId}
              filters={filters}
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
          selectedRows={(rows || []).filter(r => selected.has(r.id))}
          onClear={() => setSelected(new Set())}
          onDone={() => load()}
        />
      </div>

      {/* Right side panel */}
      <div className="min-w-0">
        <ApplicantSidePanel
          appId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onChanged={() => load()}
        />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
      <h2 className="text-[16px] font-bold text-white mb-1.5">No applications yet</h2>
      <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto">
        Once people apply to your opportunities, they show up here across all your posts. Use filters to focus on new, shortlisted or interviewing candidates.
      </p>
    </div>
  )
}