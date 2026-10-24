'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  onCreate: () => void
}

export function LookingForHeader({ onCreate }: Props) {
  const [pendingInvites, setPendingInvites] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/looking-for/invitations?direction=received&status=pending')
        const data = await res.json()
        if (!cancelled) setPendingInvites((data.invitations || []).length)
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-white leading-tight">Team Up</h1>
        <p className="mt-1.5 text-[14px] text-zinc-400 max-w-xl leading-relaxed">
          Find the people, skills and opportunities you need to build what matters.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/looking-for/invitations"
          className="relative inline-flex items-center gap-2 h-10 px-4 rounded-md border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40 text-[13.5px] font-medium text-zinc-200 transition-colors"
        >
          Invitations
          {pendingInvites > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10.5px] font-semibold bg-white text-black" style={{ height: 18 }}>
              {pendingInvites}
            </span>
          )}
        </Link>
        <button
          onClick={onCreate}
          className="inline-flex items-center h-10 px-4 rounded-md bg-white text-black hover:bg-zinc-200 text-[13.5px] font-semibold transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  )
}
