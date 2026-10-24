'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Warning } from '@phosphor-icons/react'
import { DsrtEmpty, DsrtButton } from '@/components/dsrt'

export default function ApplyInitPage() {
  const router = useRouter()
  const routeParams = useParams<{ id: string }>()
  const oppId = typeof routeParams?.id === 'string' ? routeParams.id : null

  const [error, setError] = useState<string | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!oppId || initRef.current) return
    initRef.current = true

    ;(async () => {
      try {
        const res = await fetch(`/api/opportunities/${oppId}/apply/init`, {
          method: 'POST',
        })
        const d = await res.json().catch(() => ({}))

        if (res.status === 409 && d?.status && d.status !== 'draft') {
          setError('You have already applied to this opportunity.')
          return
        }

        if (!res.ok) {
          throw new Error(d?.error || 'Failed to start application')
        }

        if (!d?.application_id) {
          throw new Error('Server did not return an application id')
        }

        router.replace(`/looking-for/${oppId}/apply/${d.application_id}`)
      } catch (e: any) {
        setError(e?.message || 'Failed to start application')
      }
    })()
  }, [oppId, router])

  return (
    <div className="min-h-screen bg-[#05070D] text-white flex items-center justify-center px-4">
      {error ? (
        <DsrtEmpty
          icon={Warning}
          title={error}
          description="You can return to the opportunity page or review your existing applications."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <DsrtButton asChild variant="outline" size="sm">
                <Link href={oppId ? `/looking-for/${oppId}` : '/looking-for'}>
                  Back to Opportunity
                </Link>
              </DsrtButton>
              <DsrtButton asChild variant="primary" size="sm">
                <Link href="/looking-for/my-applications">My Applications</Link>
              </DsrtButton>
            </div>
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-[12px] font-mono uppercase tracking-wider text-white/40">
            Preparing application studio…
          </p>
        </div>
      )}
    </div>
  )
}