'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PortfolioFilters, type PortfolioFilterState } from './PortfolioFilters'
import { PortfolioTable } from './PortfolioTable'
import { PortfolioBulkBar } from './PortfolioBulkBar'
import { PortfolioEmpty } from './PortfolioEmpty'

type SortKey =
  | 'last_activity'
  | 'created_at'
  | 'title'
  | 'applications'
  | 'awaiting'
  | 'status'

export function PortfolioPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const initial: PortfolioFilterState = useMemo(() => ({
    q: sp.get('q') || '',
    status: sp.get('status') || 'all',
    type: sp.get('type') || 'all',
    linked: sp.get('linked') || 'all',
  }), [sp])

  const [filters, setFilters] = useState<PortfolioFilterState>(initial)
  const [items, setItems] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('last_activity')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const abortRef = useRef<AbortController | null>(null)

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.status !== 'all') p.set('status', filters.status)
    if (filters.type !== 'all') p.set('type', filters.type)
    if (filters.linked !== 'all') p.set('linked', filters.linked)
    const qs = p.toString()
    router.replace(`/looking-for/my-opportunities/portfolio${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [filters, router])

  const load = useCallback(async () => {
    setError(null)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const p = new URLSearchParams()
    if (filters.q) p.set('q', filters.q)
    if (filters.status !== 'all') {
      if (['active', 'draft', 'paused', 'closed', 'filled', 'archived', 'closing-soon', 'expired'].includes(filters.status)) {
        p.set('status', filters.status)
      } else {
        p.set('filter', filters.status)
      }
    }
    if (filters.type !== 'all') p.set('type', filters.type)
    if (filters.linked !== 'all') p.set('linked', filters.linked)

    try {
      const res = await fetch(`/api/opportunities/my-opportunities?${p.toString()}`, { signal: ac.signal })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setItems(data.opportunities || [])
      // Clear selection on data change to avoid ghosts
      setSelected(new Set())
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Something went wrong')
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const sortedItems = useMemo(() => {
    if (!items) return null
    const arr = [...items]
    arr.sort((a: any, b: any) => {
      let av: any, bv: any
      switch (sortKey) {
        case 'title': av = (a.title || '').toLowerCase(); bv = (b.title || '').toLowerCase(); break
        case 'created_at': av = a.created_at || ''; bv = b.created_at || ''; break
        case 'last_activity': av = a.last_activity_at || a.updated_at || ''; bv = b.last_activity_at || b.updated_at || ''; break
        case 'applications': av = a.application_count || 0; bv = b.application_count || 0; break
        case 'awaiting':
          av = (a.application_count || 0) - (a.qualified_count || 0)
          bv = (b.application_count || 0) - (b.qualified_count || 0)
          break
        case 'status': av = a.status || ''; bv = b.status || ''; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [items, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir(k === 'title' ? 'asc' : 'desc') }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!sortedItems) return
    if (selected.size === sortedItems.length) setSelected(new Set())
    else setSelected(new Set(sortedItems.map(i => i.id)))
  }

  return (
    <div className="space-y-4">
      <PortfolioFilters value={filters} onChange={setFilters} totalCount={items?.length ?? null} />

      {error && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />
          ))}
        </div>
      ) : sortedItems && sortedItems.length === 0 ? (
        <PortfolioEmpty hasFilters={
          filters.q !== '' || filters.status !== 'all' || filters.type !== 'all' || filters.linked !== 'all'
        } onClear={() => setFilters({ q: '', status: 'all', type: 'all', linked: 'all' })} />
      ) : (
        <PortfolioTable
          items={sortedItems!}
          selected={selected}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onRefresh={load}
        />
      )}

      <PortfolioBulkBar
        selectedIds={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        onDone={() => { load() }}
      />
    </div>
  )
}