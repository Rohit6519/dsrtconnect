'use client'

import { ArrowRight } from '@phosphor-icons/react'

interface Props {
  onCreate: () => void
}

export function LookingForHero({ onCreate }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/60 via-zinc-950 to-black">
      {/* Subtle network pattern */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-teamup" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-teamup)" />
        </svg>
      </div>

      {/* Subtle radial accent */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-500/[0.04] blur-3xl pointer-events-none" />

      <div className="relative px-8 py-10 md:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-white leading-tight">
            Build with the right people.
          </h2>
          <p className="mt-2 text-[14px] text-zinc-400">
            Find builders, collaborators and opportunities across DSRT Connect.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-zinc-500">
            <span>Build</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span>Collaborate</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span>Join</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span>Create</span>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-zinc-700 hover:border-zinc-500 bg-zinc-900/60 hover:bg-zinc-800/80 text-white text-[13px] font-medium transition-all shrink-0"
        >
          Create a request
          <ArrowRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
