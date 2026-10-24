'use client'

import { useCallback, useEffect, useState } from 'react'
import { AuditFilters, type AuditFilterState } from './parts/AuditFilters'
import { AuditTable } from './parts/AuditTable'
import { AuditDetailDrawer } from './parts/AuditDetailDrawer'
import { ExportsPanel } from './parts/ExportsPanel'
import { IntegrityBadge } from './parts/IntegrityBadge'
import { RetentionPanel } from './parts/RetentionPanel'
import { ShieldCheck } from '@phosphor-icons/react'

export function ComplianceDashboard({ opportunityId }: { opportunityId: string }) {
  const [filters, setFilters] = useState<AuditFilterState>({
    category: '', action: '', actor_id: '', q: '', since: '', until: '',
  })
  const [entries, setEntries] = useState<any[] | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [openEntry, setOpenEntry] = useState<any | null>(null)

  const load = useCallback(async (append = false) => {
    const p = new URLSearchParams()
    p.set('opportunity_id', opportunityId)
    p.set('limit', '100')
    if (filters.category) p.set('category', filters.category)
    if (filters.action)   p.set('action', filters.action)
    if (filters.actor_id) p.set('actor_id', filters.actor_id)
    if (filters.q)        p.set('q', filters.q)
    if (filters.since)    p.set('since', filters.since)
    if (filters.until)    p.set('until', filters.until)
    if (append && cursor) p.set('cursor', cursor)

    const res = await fetch(`/api/compliance/audit?${p.toString()}`)
    const d = await res.json()
    const rows = d.entries || []
    setEntries(prev => (append && prev) ? [...prev, ...rows] : rows)
    setCursor(d.next_cursor ? String(d.next_cursor) : null)
    setHasMore(!!d.has_more)
  }, [opportunityId, filters, cursor])

  useEffect(() => { load(false) }, [opportunityId, filters]) // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
          <ShieldCheck size={16} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-bold text-white">Compliance & audit</div>
          <div className="text-[11.5px] text-zinc-500 mt-0.5">
            Immutable log of every action on this opportunity. Every entry is hash-chained.
          </div>
        </div>
        <IntegrityBadge />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 min-w-0">
          <AuditFilters value={filters} onChange={setFilters} />
          <AuditTable
            entries={entries}
            onOpen={setOpenEntry}
            hasMore={hasMore}
            onLoadMore={() => load(true)}
          />
        </div>
        <div className="space-y-4">
          <ExportsPanel opportunityId={opportunityId} />
          <RetentionPanel opportunityId={opportunityId} />
        </div>
      </div>

      {openEntry && <AuditDetailDrawer entry={openEntry} onClose={() => setOpenEntry(null)} />}
    </div>
  )
}