'use client'

import Link from 'next/link'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { ApplicationFilters } from './ApplicationsFilters'

const STAGE_BADGE: Record<string, string> = {
  submitted: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  viewed: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  'under-review': 'border-blue-500/25 bg-blue-500/[0.08] text-blue-300',
  shortlisted: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
  interview: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  offer: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-200',
  accepted: 'border-emerald-500/25 bg-emerald-500/[0.10] text-emerald-300',
  declined: 'border-red-500/25 bg-red-500/[0.06] text-red-300',
  withdrawn: 'border-zinc-700 bg-zinc-900 text-zinc-500',
}

const STAGE_LABEL: Record<string, string> = {
  submitted: 'New',
  viewed: 'Viewed',
  'under-review': 'Reviewing',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  accepted: 'Selected',
  declined: 'Rejected',
  withdrawn: 'Withdrawn',
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

export function ApplicationsTable({
  rows,
  selected,
  onToggleOne,
  onToggleAll,
  onOpen,
  activeAppId,
  filters,
  onChangeFilters,
}: {
  rows: any[]
  selected: Set<string>
  onToggleOne: (id: string) => void
  onToggleAll: () => void
  onOpen: (id: string) => void
  activeAppId: string | null
  filters: ApplicationFilters
  onChangeFilters: (v: ApplicationFilters) => void
}) {
  const allChecked = rows.length > 0 && selected.size === rows.length
  const someChecked = selected.size > 0 && !allChecked

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-zinc-800/80 bg-zinc-950/40">
            <tr className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              <th className="w-10 pl-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked }}
                  onChange={onToggleAll}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 accent-white cursor-pointer"
                />
              </th>
              <th className="py-3 min-w-[260px]">Applicant</th>
              <th className="py-3 min-w-[220px]">Opportunity</th>
              <th className="py-3 w-[120px]">Stage</th>
              <th className="py-3 w-[180px]">Relevant skills</th>
              <th className="py-3 w-[130px]">Applied</th>
              <th className="py-3 w-[130px]">Reviewer</th>
              <th className="py-3 w-[80px] pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {rows.map(r => {
              const isSel = selected.has(r.id)
              const isActive = activeAppId === r.id
              const u = r.applicant || {}
              const name = u.full_name || u.username || 'Applicant'
              const opp = r.opportunity || {}
              const badge = STAGE_BADGE[r.pipeline_stage] || STAGE_BADGE.submitted
              const stageLabel = STAGE_LABEL[r.pipeline_stage] || r.pipeline_stage
              const highlighted = Array.isArray(r.highlighted_skills) ? r.highlighted_skills : []
              const reviewersArr = r.reviewers || []

              return (
                <tr
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  className={
                    'group cursor-pointer transition-colors ' +
                    (isActive
                      ? 'bg-zinc-900/70'
                      : isSel
                        ? 'bg-zinc-900/50'
                        : 'hover:bg-zinc-900/30')
                  }
                >
                  <td className="pl-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => onToggleOne(r.id)}
                      className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 accent-white cursor-pointer"
                    />
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-[12px] font-bold text-zinc-500">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13.5px] font-semibold text-white truncate">{name}</span>
                          {u.is_verified && (
                            <span className="w-3.5 h-3.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-[8px] font-extrabold text-blue-300 flex items-center justify-center">✓</span>
                          )}
                          {r.is_starred && (
                            <span className="text-amber-400 text-[10px]" title="Starred">★</span>
                          )}
                        </div>
                        {u.tagline && (
                          <div className="text-[11.5px] text-zinc-500 truncate max-w-[280px]">{u.tagline}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <button
                      onClick={(e) => { e.stopPropagation(); onChangeFilters({ ...filters, opportunity_id: opp.id || '' }) }}
                      className="text-left"
                      title="Filter to this opportunity"
                    >
                      <div className="text-[12.5px] text-zinc-200 font-semibold truncate max-w-[220px]">{opp.title || '—'}</div>
                      <div className="text-[10.5px] text-zinc-500 font-mono">{opp.opportunity_number || ''}</div>
                    </button>
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <span className={'inline-flex items-center h-6 px-2 rounded-md text-[10.5px] font-bold uppercase tracking-wider border ' + badge}>
                      {stageLabel}
                    </span>
                  </td>

                  <td className="py-3 pr-4 align-top">
                    {highlighted.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {highlighted.slice(0, 3).map((s: string) => (
                          <span key={s} className="inline-flex items-center h-5 px-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10.5px] font-medium text-zinc-300">
                            {s}
                          </span>
                        ))}
                        {highlighted.length > 3 && (
                          <span className="text-[10.5px] text-zinc-500">+{highlighted.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-zinc-600">—</span>
                    )}
                  </td>

                  <td className="py-3 pr-4 align-top text-[12px] text-zinc-400">
                    {timeAgo(r.created_at)}
                  </td>

                  <td className="py-3 pr-4 align-top">
                    {reviewersArr.length === 0 ? (
                      <span className="text-[11.5px] text-zinc-500">Unassigned</span>
                    ) : (
                      <span className="text-[12px] text-zinc-300">
                        {reviewersArr.length === 1 ? '1 reviewer' : `${reviewersArr.length} reviewers`}
                      </span>
                    )}
                  </td>

                  <td className="py-3 pr-4 align-top">
                    <div className="flex justify-end">
                      <span className={'inline-flex items-center gap-1 text-[12px] ' + (isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white')}>
                        Open
                        <ArrowUpRight size={11} weight="bold" />
                      </span>
                    </div>
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