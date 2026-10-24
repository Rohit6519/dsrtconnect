'use client'

import Link from 'next/link'
import { Briefcase } from '@phosphor-icons/react'

export function PortfolioEmpty({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  if (hasFilters) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <Briefcase size={20} className="text-zinc-500" />
        </div>
        <h2 className="text-[15px] font-bold text-white mb-1">No matches for these filters</h2>
        <p className="text-[12.5px] text-zinc-500 mb-4">Adjust or clear the filters to see all your opportunities.</p>
        <button
          onClick={onClear}
          className="inline-flex items-center h-9 px-4 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[13px] font-semibold text-zinc-300 hover:text-white"
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
        <Briefcase size={22} className="text-zinc-500" />
      </div>
      <h2 className="text-[17px] font-bold text-white mb-1.5">No opportunities yet</h2>
      <p className="text-[13px] text-zinc-500 mb-6 max-w-md mx-auto">
        Publish your first opportunity to open the full management workspace — pipeline, analytics, distribution and more.
      </p>
      <Link
        href="/looking-for/create"
        className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-white text-black hover:bg-zinc-100 text-[13px] font-bold shadow-[0_2px_12px_rgba(255,255,255,0.1)]"
      >
        Create your first opportunity
      </Link>
    </div>
  )
}