'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DsrtButton } from '@/components/dsrt'

interface PromptState {
  show: boolean
  context?: string
  message?: string
  readiness_score?: number
  trust_level?: string
  email?: string
}

export function VerificationBanner() {
  const [state, setState] = useState<PromptState | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchState = async () => {
      try {
        const res = await fetch('/api/auth/verification-prompt')
        const data = await res.json()
        if (!cancelled && data.show) {
          setState(data)
          fetch('/api/auth/verification-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: data.context, action: 'SHOWN' })
          }).catch(() => {})
        }
      } catch {}
    }
    fetchState()
    return () => { cancelled = true }
  }, [])

  const handleVerify = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/verification-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: state?.context, action: 'CLICKED' })
      })

      const res = await fetch('/api/auth/request-verification', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Verification email queued. Check your inbox shortly.')
      setDismissed(true)
    } catch (err: any) {
      toast.error(err.message || 'Could not send verification email')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    fetch('/api/auth/verification-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: state?.context, action: 'DISMISSED' })
    }).catch(() => {})
  }

  if (!state?.show || dismissed) return null

  return (
    <div className="border border-[#2c5282]/40 bg-gradient-to-r from-[#1e3a5f]/30 to-[#0f172a]/50 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/60 border border-[#2c5282]/50 flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-4 h-4 text-[#93c5fd]" weight="regular" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white font-medium leading-snug">{state.message}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <DsrtButton size="xs" variant="primary" onClick={handleVerify} loading={loading}>
          Verify email
        </DsrtButton>
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>
    </div>
  )
}