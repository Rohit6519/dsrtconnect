// filepath: components/looking-for/studio/StudioHeader.tsx
'use client'

import { useState } from 'react'
import {
  ArrowLeft, Eye, CheckCircle, WarningCircle, CircleNotch,
} from '@phosphor-icons/react'
import { useStudio } from './StudioContext'
import { StudioPreview } from './steps/parts/StudioPreview'

export function StudioHeader({ onBack }: { onBack: () => void }) {
  const { draft, saveStatus, lastSavedAt } = useStudio()
  const isPublished = draft.opportunity.status !== 'draft'

  return (
    <div className="sticky top-0 z-30 bg-[#08090F]/95 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-[60px] flex items-center gap-3 md:gap-4">
        
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 h-9 px-2.5 -ml-2.5 rounded-lg text-[12.5px] font-medium text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors shrink-0"
        >
          <ArrowLeft size={13} weight="bold" />
          <span className="hidden sm:inline">Looking For</span>
        </button>

        <div className="w-px h-5 bg-white/[0.08] shrink-0" />

        <div className="min-w-0 flex-1 flex items-center gap-2.5">
          <h1 className="text-[14px] font-bold text-white tracking-tight truncate">
            {isPublished ? 'Edit Opportunity' : 'Create Opportunity'}
          </h1>
          {draft.opportunity.opportunity_number && (
            <span className="hidden sm:inline-flex items-center h-[22px] px-2 rounded-md text-[10.5px] font-mono font-bold text-white/70 bg-white/[0.06] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shrink-0">
              {draft.opportunity.opportunity_number}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
          <div className="hidden sm:block w-px h-5 bg-white/[0.08]" />
          <PreviewOpener />
        </div>
      </div>
    </div>
  )
}

function PreviewOpener() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/[0.08] hover:border-white/[0.18] bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:from-white/[0.08] hover:to-white/[0.03] text-[12.5px] font-semibold text-white/75 hover:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2)]"
      >
        <Eye size={13} weight="regular" />
        <span className="hidden sm:inline">Preview</span>
      </button>
      {open && <StudioPreview onClose={() => setOpen(false)} />}
    </>
  )
}

function SaveIndicator({ status, lastSavedAt }: { status: string; lastSavedAt: Date | null }) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/45">
        <CircleNotch size={11} className="animate-spin" />
        <span className="hidden sm:inline">Saving…</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-300">
        <WarningCircle size={12} weight="fill" />
        <span className="hidden sm:inline">Save failed</span>
      </div>
    )
  }
  if (status === 'saved' || (status === 'idle' && lastSavedAt)) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/45">
        <CheckCircle size={11} weight="fill" className="text-emerald-400/80" />
        <span className="hidden sm:inline">
          {lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}` : 'Saved'}
        </span>
      </div>
    )
  }
  return null
}

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return `${m}m ago`
}