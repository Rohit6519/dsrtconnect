'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Warning, ArrowClockwise, ArrowLeft } from '@phosphor-icons/react'

export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof console !== 'undefined') {
      console.error('[Team Up error]', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 mx-auto rounded-lg border border-red-500/30 bg-red-500/5 flex items-center justify-center text-red-400 mb-5">
          <Warning size={22} weight="fill" />
        </div>
        <h1 className="text-[18px] font-semibold text-white mb-1.5">Something went wrong</h1>
        <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">
          The page couldn't load. This is usually temporary. Try again, or head back to Team Up.
        </p>
        {error?.digest && (
          <div className="text-[11px] text-zinc-600 font-mono mb-5">Error {error.digest}</div>
        )}
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-semibold"
          >
            <ArrowClockwise size={12} weight="bold" />
            Try again
          </button>
          <Link
            href="/looking-for"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-600 text-[13px] text-zinc-300"
          >
            <ArrowLeft size={12} weight="bold" />
            Back to Team Up
          </Link>
        </div>
      </div>
    </div>
  )
}
