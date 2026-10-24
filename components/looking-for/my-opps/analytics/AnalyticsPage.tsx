'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnalyticsToolbar } from './AnalyticsToolbar'
import { AnalyticsSubNav, type AnalyticsView } from './AnalyticsSubNav'
import { OverviewView } from './views/OverviewView'
import { ReachView } from './views/ReachView'
import { FunnelView } from './views/FunnelView'
import { SourcesView } from './views/SourcesView'
import { OutcomesView } from './views/OutcomesView'

export function AnalyticsPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const [view, setView] = useState<AnalyticsView>((sp.get('view') as AnalyticsView) || 'overview')
  const [range, setRange] = useState<string>(sp.get('range') || '30d')
  const [opportunityId, setOpportunityId] = useState<string>(sp.get('opportunity_id') || '')

  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams()
    if (view !== 'overview') p.set('view', view)
    if (range !== '30d') p.set('range', range)
    if (opportunityId) p.set('opportunity_id', opportunityId)
    const qs = p.toString()
    router.replace(`/looking-for/my-opportunities/analytics${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [view, range, opportunityId, router])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const p = new URLSearchParams()
    p.set('range', range)
    if (opportunityId) p.set('opportunity_id', opportunityId)

    try {
      const res = await fetch(`/api/opportunities/dashboard/analytics?${p.toString()}`, { signal: ac.signal })
      if (!res.ok) throw new Error('Failed to load analytics')
      const j = await res.json()
      setData(j)
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }, [range, opportunityId])

  useEffect(() => { load() }, [load])

  const exportUrl = useMemo(() => {
    const p = new URLSearchParams()
    p.set('range', range)
    if (opportunityId) p.set('opportunity_id', opportunityId)
    return `/api/opportunities/dashboard/analytics/export?${p.toString()}`
  }, [range, opportunityId])

  return (
    <div className="space-y-4">
      <AnalyticsToolbar
        range={range}
        onRangeChange={setRange}
        opportunityId={opportunityId}
        onOpportunityChange={setOpportunityId}
        exportUrl={exportUrl}
      />

      <AnalyticsSubNav active={view} onChange={setView} />

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="h-24 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />
        </div>
      ) : (
        <>
          {view === 'overview' && <OverviewView data={data} />}
          {view === 'reach' && <ReachView data={data} />}
          {view === 'funnel' && <FunnelView data={data} />}
          {view === 'sources' && <SourcesView data={data} />}
          {view === 'outcomes' && <OutcomesView data={data} />}
        </>
      )}
    </div>
  )
}