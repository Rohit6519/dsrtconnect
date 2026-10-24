'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PerformanceTab({ opportunityId }: { opportunityId: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/looking-for/my-opportunities/analytics?opportunity_id=${opportunityId}`)
  }, [opportunityId, router])
  return (
    <div className="rounded-2xl border border-zinc-800/80 p-8 text-center text-[12.5px] text-zinc-500 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
      Redirecting to Analytics for this opportunity…
    </div>
  )
}