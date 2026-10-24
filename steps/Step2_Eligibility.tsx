'use client'

import { useEffect, useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { EligibilityBanner } from '../shared/EligibilityBanner'

interface Props {
  slug: string
  invitedUserId: string
  positionId?: string | null
  onResult: (result: any) => void
}

export function Step2_Eligibility({ slug, invitedUserId, positionId, onResult }: Props) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/ventures/${slug}/team/invitations/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invited_user_id: invitedUserId,
            position_id: positionId || null
          })
        })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          setError(data.error || 'Eligibility check failed')
        } else {
          setResult(data.eligibility)
          onResult(data.eligibility)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    check()
    return () => { cancelled = true }
  }, [slug, invitedUserId, positionId, onResult])

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">Eligibility Check</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Verifying that this user can be invited to your venture.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0d10] p-6 flex items-center gap-3 text-[13px] text-zinc-400">
          <CircleNotch size={16} className="animate-spin" />
          Running eligibility checks…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4 text-[12.5px] text-red-300">
          {error}
        </div>
      ) : result ? (
        <>
          <EligibilityBanner result={result} />

          <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              <strong className="text-zinc-400">What we check:</strong> Duplicate memberships, pending
              invitations, position capacity, venture status, and user account state. Eligibility is
              re-checked when the recipient tries to accept.
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}