'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react'
import { useAppStudio } from './AppStudioContext'

export function AppStudioHeader() {
  const { draft, saveStatus, lastSavedAt } = useAppStudio()
  const opp = draft.opportunity

  return (
    <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-[57px] flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link
            href={`/looking-for/${opp.slug || opp.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={12} weight="bold" />
            Cancel
          </Link>

          <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

          <div className="min-w-0 hidden sm:block">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Apply To</div>
            <div className="text-[13.5px] font-bold text-white truncate leading-tight">
              {opp.title}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
          
          {/* Subtle exit mechanism */}
          <Link
            href="/looking-for/my-applications"
            className="text-[11.5px] text-zinc-500 hover:text-zinc-300 transition-colors ml-4"
          >
            Save & Exit
          </Link>
        </div>

      </div>
    </div>
  )
}

function SaveIndicator({ status, lastSavedAt }: { status: string; lastSavedAt: Date | null }) {
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-400">
        <CircleNotch size={11} className="animate-spin" />
        Saving…
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-red-300">
        <WarningCircle size={12} weight="fill" />
        Couldn't save
      </div>
    )
  }
  if (status === 'saved' || (status === 'idle' && lastSavedAt)) {
    return (
      <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-500">
        <CheckCircle size={11} weight="fill" className="text-emerald-400" />
        Draft saved
      </div>
    )
  }
  return null
}