'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  DotsThree, ArrowUpRight, ArrowsDownUp, CaretUp, CaretDown,
} from '@phosphor-icons/react'
import { OpportunityStatusActions } from '@/components/looking-for/v2/manage/OpportunityStatusActions'

const STATUS_BADGE: Record<string, string> = {
  active: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
  'closing-soon': 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  draft: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  paused: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  filled: 'border-blue-500/25 bg-blue-500/[0.08] text-blue-300',
  closed: 'border-zinc-700 bg-zinc-900 text-zinc-500',
  expired: 'border-zinc-700 bg-zinc-900 text-zinc-500',
  archived: 'border-zinc-700 bg-zinc-900 text-zinc-500',
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

type SortKey =
  | 'last_activity'
  | 'created_at'
  | 'title'
  | 'applications'
  | 'awaiting'
  | 'status'

export function PortfolioTable({
  items,
  selected,
  onToggleOne,
  onToggleAll,
  sortKey,
  sortDir,
  onSort,
  onRefresh,
}: {
  items: any[]
  selected: Set<string>
  onToggleOne: (id: string) => void
  onToggleAll: () => void
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  onRefresh: () => void
}) {
  const allChecked = items.length > 0 && selected.size === items.length
  const someChecked = selected.size > 0 && !allChecked

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-zinc-800/80 bg-zinc-950/40">
            <tr className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              <Th className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked }}
                  onChange={onToggleAll}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 accent-white cursor-pointer"
                  aria-label="Select all"
                />
              </Th>
              <SortableTh k="title" activeKey={sortKey} dir={sortDir} onSort={onSort} className="min-w-[260px]">
                Opportunity
              </SortableTh>
              <SortableTh k="status" activeKey={sortKey} dir={sortDir} onSort={onSort} className="w-[130px]">
                Status
              </SortableTh>
              <Th className="w-[180px]">Linked to</Th>
              <SortableTh k="applications" activeKey={sortKey} dir={sortDir} onSort={onSort} className="w-[110px] text-right pr-4">
                Applications
              </SortableTh>
              <SortableTh k="awaiting" activeKey={sortKey} dir={sortDir} onSort={onSort} className="w-[110px] text-right pr-4">
                Awaiting
              </SortableTh>
              <Th className="w-[110px] text-right pr-4">In progress</Th>
              <SortableTh k="last_activity" activeKey={sortKey} dir={sortDir} onSort={onSort} className="w-[140px]">
                Last activity
              </SortableTh>
              <SortableTh k="created_at" activeKey={sortKey} dir={sortDir} onSort={onSort} className="w-[110px]">
                Created
              </SortableTh>
              <Th className="w-[120px] pr-4 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {items.map(op => {
              const isSel = selected.has(op.id)
              
              // Prefer live-computed value; fall back to derivation for older payloads.
              const awaiting =
                typeof op.awaiting_count === 'number'
                  ? op.awaiting_count
                  : Math.max(0, (op.application_count || 0) - (op.qualified_count || 0))
              const inProg = op.qualified_count || 0

              const linked =
                op.project?.name ? { label: op.project.name, kind: 'Project' } :
                op.venture?.name ? { label: op.venture.name, kind: 'Venture' } :
                null

              return (
                <tr
                  key={op.id}
                  className={
                    'group transition-colors ' +
                    (isSel ? 'bg-zinc-900/50' : 'hover:bg-zinc-900/30')
                  }
                >
                  <td className="pl-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => onToggleOne(op.id)}
                      className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 accent-white cursor-pointer"
                      aria-label={`Select ${op.title}`}
                    />
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <Link
                      href={`/looking-for/my-opportunities/${op.id}`}
                      className="text-[13.5px] font-bold text-white hover:text-blue-300 leading-snug"
                    >
                      {op.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      {op.opportunity_number && <span className="font-mono">{op.opportunity_number}</span>}
                      {op.opportunity_number && <span className="text-zinc-700">·</span>}
                      <span className="capitalize">{String(op.opportunity_type || '').replace(/-/g, ' ')}</span>
                    </div>
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <span className={
                      'inline-flex items-center h-6 px-2 rounded-md text-[10.5px] font-bold uppercase tracking-wider border ' +
                      (STATUS_BADGE[op.status] || STATUS_BADGE.active)
                    }>
                      {op.status}
                    </span>
                  </td>

                  <td className="py-3 pr-4 align-top">
                    {linked ? (
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{linked.kind}</div>
                        <div className="text-[12.5px] text-zinc-200 truncate">{linked.label}</div>
                      </div>
                    ) : (
                      <span className="text-[12px] text-zinc-500">Standalone</span>
                    )}
                  </td>

                  <td className="py-3 pr-4 align-top text-right">
                    <span className="text-[13px] font-semibold text-white">{(op.application_count || 0).toLocaleString()}</span>
                  </td>

                  <td className="py-3 pr-4 align-top text-right">
                    <span className={'text-[13px] font-semibold ' + (awaiting > 0 ? 'text-amber-300' : 'text-zinc-400')}>
                      {awaiting.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 pr-4 align-top text-right">
                    <span className={'text-[13px] font-semibold ' + (inProg > 0 ? 'text-emerald-300' : 'text-zinc-400')}>
                      {inProg.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 pr-4 align-top text-[12px] text-zinc-400">
                    {timeAgo(op.last_activity_at || op.updated_at)}
                  </td>

                  <td className="py-3 pr-4 align-top text-[12px] text-zinc-500">
                    {timeAgo(op.created_at)}
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <RowActions op={op} onRefresh={onRefresh} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={'py-3 px-2 ' + (className || '')}>{children}</th>
}

function SortableTh({
  k, activeKey, dir, onSort, children, className,
}: {
  k: SortKey
  activeKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  children: React.ReactNode
  className?: string
}) {
  const active = activeKey === k
  return (
    <th className={'py-3 px-2 ' + (className || '')}>
      <button
        onClick={() => onSort(k)}
        className={
          'inline-flex items-center gap-1 uppercase tracking-[0.14em] transition-colors ' +
          (active ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-300')
        }
      >
        {children}
        {active ? (
          dir === 'asc' ? <CaretUp size={9} weight="bold" /> : <CaretDown size={9} weight="bold" />
        ) : (
          <ArrowsDownUp size={9} weight="bold" className="opacity-60" />
        )}
      </button>
    </th>
  )
}

function RowActions({ op, onRefresh }: { op: any; onRefresh: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/looking-for/my-opportunities/${op.id}`}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white/95 text-black hover:bg-white text-[12px] font-bold transition-colors"
      >
        Manage
        <ArrowUpRight size={11} weight="bold" />
      </Link>
      <div className="relative" ref={ref}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          className="w-8 h-8 rounded-lg border border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-950/50"
          aria-label="More actions"
        >
          <DotsThree size={14} weight="bold" />
        </button>
        {open && (
          <OpportunityStatusActions
            opportunity={op}
            onClose={() => setOpen(false)}
            onRefresh={onRefresh}
            onView={() => router.push(`/looking-for/${op.slug || op.id}`)}
          />
        )}
      </div>
    </div>
  )
}