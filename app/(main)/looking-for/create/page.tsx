'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CreatePage() {
  const router = useRouter()
  const sp = useSearchParams()
  const editId = sp.get('edit')
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    ;(async () => {
      // If editing an existing opp, redirect to studio for that ID
      if (editId) {
        router.replace(`/looking-for/create-v2/${editId}`)
        return
      }

      // Otherwise create new draft
      try {
        const res = await fetch('/api/opportunities/drafts', { method: 'POST' })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Failed to create draft')
        router.replace(`/looking-for/create-v2/${d.draft_id}`)
      } catch (e: any) {
        setError(e?.message || 'Failed')
      }
    })()
  }, [router, editId])

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex items-center justify-center">
      {error ? (
        <div className="text-center max-w-md px-6">
          <div className="text-[15px] font-bold text-red-300 mb-2">Could not open Studio</div>
          <div className="text-[12.5px] text-zinc-500 mb-4">{error}</div>
          <button
            onClick={() => router.push('/looking-for')}
            className="h-9 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300 hover:text-white"
          >
            Back to Looking For
          </button>
        </div>
      ) : (
        <div className="text-[13px] text-zinc-500">Opening Studio…</div>
      )}
    </div>
  )
}