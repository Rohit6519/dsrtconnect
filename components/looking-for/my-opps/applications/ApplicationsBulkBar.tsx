'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChatCircle, PauseCircle, ArrowsClockwise, Star, X } from '@phosphor-icons/react'
import { StageActionDrawer, type StageActionTarget } from '@/components/looking-for/my-opps/command-center/StageActionDrawer'
import type { PipelineStage } from '@/lib/applications/types'

const STAGE_OPTIONS: { key: PipelineStage; label: string; Icon: any }[] = [
  { key: 'reviewing',    label: 'Reviewing', Icon: PauseCircle },
  { key: 'screening',    label: 'Shortlist', Icon: CheckCircle },
  { key: 'interviewing', label: 'Interview', Icon: ChatCircle },
  { key: 'hired',        label: 'Select',    Icon: CheckCircle },
  { key: 'rejected',     label: 'Reject',    Icon: XCircle },
]

export function ApplicationsBulkBar({
  selectedIds,
  selectedRows,
  onClear,
  onDone,
}: {
  selectedIds: string[]
  /**
   * Optional: full row info so the drawer can show applicant names
   * and pass opportunity context.
   */
  selectedRows?: Array<{
    id: string
    applicant?: { full_name?: string | null; username?: string | null } | null
    opportunity?: {
      id: string
      title?: string | null
      slug?: string | null
      poster?: { full_name?: string | null } | null
    } | null
  }>
  onClear: () => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [drawerStage, setDrawerStage] = useState<PipelineStage | null>(null)

  if (selectedIds.length === 0) return null

  // Group selected rows by opportunity — the drawer needs a single opportunity context.
  // If the selection spans multiple opps, we open the drawer with the first opp
  // and treat targets across opps identically (the workflow engine handles each).
  const rows = selectedRows || selectedIds.map(id => ({ id }))
  const firstRow: any = rows[0] || {}
  const opportunity = {
    id: firstRow?.opportunity?.id || '',
    title: firstRow?.opportunity?.title || 'this opportunity',
    slug: firstRow?.opportunity?.slug || null,
    poster_name: firstRow?.opportunity?.poster?.full_name || null,
    organization_name: null,
  }

  const targets: StageActionTarget[] = rows.map((r: any) => ({
    applicationId: r.id,
    applicantName: r.applicant?.full_name || r.applicant?.username || null,
  }))

  const openStage = (key: PipelineStage) => {
    setDrawerStage(key)
  }

  const runStar = async (value: boolean, key: string) => {
    setBusy(key)
    try {
      const res = await fetch('/api/opportunities/applications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_ids: selectedIds, action: 'star', value }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Failed')
      onClear()
      onDone()
    } catch (e: any) {
      alert(e?.message || 'Bulk action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center h-12 rounded-xl border border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden divide-x divide-zinc-800">
          <div className="px-4 text-[12.5px] text-zinc-300 font-semibold flex items-center">
            {selectedIds.length} selected
          </div>

          <div className="flex items-stretch h-full divide-x divide-zinc-800">
            {STAGE_OPTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => openStage(s.key)}
                disabled={!!busy}
                className={
                  'inline-flex items-center justify-center gap-1.5 px-4 text-[12px] font-semibold transition-colors disabled:opacity-60 h-full ' +
                  (s.key === 'rejected'
                    ? 'text-zinc-400 hover:text-red-300 hover:bg-red-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50')
                }
              >
                <s.Icon size={14} weight="regular" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-stretch h-full divide-x divide-zinc-800">
            <button
              onClick={() => runStar(true, 'star')}
              disabled={!!busy}
              className="inline-flex items-center justify-center gap-1.5 px-4 text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50 h-full transition-colors"
            >
              <Star size={14} weight="regular" />
              Star
            </button>
            <button
              onClick={() => runStar(false, 'unstar')}
              disabled={!!busy}
              className="inline-flex items-center justify-center gap-1.5 px-4 text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50 h-full transition-colors"
            >
              <ArrowsClockwise size={14} weight="regular" />
              Unstar
            </button>
          </div>

          <button
            onClick={onClear}
            className="inline-flex items-center justify-center gap-1.5 px-4 h-full text-[12px] font-semibold text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <X size={12} weight="bold" />
            Clear
          </button>
        </div>
      </div>

      {drawerStage && (
        <StageActionDrawer
          open={!!drawerStage}
          onClose={() => setDrawerStage(null)}
          onCompleted={() => {
            setDrawerStage(null)
            onClear()
            onDone()
          }}
          targetStage={drawerStage}
          targets={targets}
          opportunity={opportunity}
        />
      )}
    </>
  )
}