'use client'

import { BookOpen, Plus } from '@phosphor-icons/react'

interface Props {
  venture: any
  slug: string
  isOwner: boolean
}

export function VentureDocumentation({ venture, slug, isOwner }: Props) {
  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-white">Documentation</h2>
          <p className="text-[12.5px] text-white/45 mt-0.5">Company overview, technical docs, and press kit</p>
        </div>
        {isOwner && (
          <button className="text-[12.5px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 h-9 rounded-lg flex items-center gap-1.5">
            <Plus size={13} weight="bold" /> Create Doc
          </button>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/[0.06] items-center justify-center mb-4">
          <BookOpen size={26} className="text-white/40" />
        </div>
        <p className="text-[15px] font-semibold text-white">Documentation coming soon</p>
        <p className="text-[12.5px] text-white/45 mt-1 max-w-sm mx-auto">
          Structured documentation for your venture — coming in next update.
        </p>
      </div>
    </div>
  )
}
