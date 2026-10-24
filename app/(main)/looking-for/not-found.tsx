'use client'

import Link from 'next/link'
import { Compass, ArrowLeft } from '@phosphor-icons/react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 mx-auto rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-500 mb-5">
          <Compass size={22} weight="regular" />
        </div>
        <h1 className="text-[20px] font-semibold text-white mb-1.5">Opportunity not found</h1>
        <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">
          This opportunity may have been closed, removed, or the link is incorrect.
        </p>
        <Link
          href="/looking-for"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-semibold"
        >
          <ArrowLeft size={12} weight="bold" />
          Back to Team Up
        </Link>
      </div>
    </div>
  )
}
