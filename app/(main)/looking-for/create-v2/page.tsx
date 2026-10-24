'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DsrtEmpty, DsrtButton } from '@/components/dsrt'

export default function CreateV2Landing() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const created = useRef(false)

  useEffect(() => {
    if (created.current) return
    created.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/opportunities/drafts', { method: 'POST' })
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Failed to create draft')
        router.replace(`/looking-for/create-v2/${d.draft_id}`)
      } catch (e: any) {
        setError(e?.message || 'Failed')
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex items-center justify-center px-4">
      {error ? (
        <DsrtEmpty
          title="Could not create draft"
          description={error}
          action={
            <DsrtButton variant="outline" onClick={() => router.push('/looking-for')}>
              Back to Looking For
            </DsrtButton>
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-[12px] font-mono uppercase tracking-wider text-white/40">
            Creating draft…
          </p>
        </div>
      )}
    </div>
  )
}