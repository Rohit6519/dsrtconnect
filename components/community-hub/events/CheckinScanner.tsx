'use client'

import { useEffect, useState } from 'react'
import { Check, X, Loader2, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { DsrtPanel, DsrtButton } from '@/components/dsrt'

interface Props { token: string }

export function CheckinScanner({ token }: Props) {
  const [state, setState] = useState<'checking' | 'ok' | 'already' | 'error'>('checking')
  const [details, setDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/v1/community/events/checkin', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, method: 'QR' }),
        })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) { setError(json?.error?.message || 'Check-in failed'); setState('error'); return }
        setDetails(json?.data)
        setState(json?.data?.already_checked_in ? 'already' : 'ok')
      } catch (e: any) {
        if (!cancelled) { setError('Network error'); setState('error') }
      }
    }
    run()
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-screen bg-[#05070D] flex items-center justify-center p-4">
      <DsrtPanel
        variant={state === 'ok' ? 'accent' : 'default'}
        padding="lg"
        className="w-full max-w-sm text-center shadow-2xl"
      >
        <div className="w-16 h-16 rounded-full mx-auto mb-5 border-2 border-white/20 flex items-center justify-center bg-white/[0.05]">
          {state === 'checking' && <Loader2 className="w-6 h-6 animate-spin text-white/70" />}
          {state === 'ok' && <Check className="w-6 h-6 text-[#93c5fd]" strokeWidth={3} />}
          {state === 'already' && <QrCode className="w-6 h-6 text-white/70" strokeWidth={2} />}
          {state === 'error' && <X className="w-6 h-6 text-red-400" strokeWidth={3} />}
        </div>

        {state === 'checking' && (
          <><h1 className="text-[18px] font-bold text-white mb-2">Verifying Check-in</h1><p className="text-[13px] text-white/50 font-mono">Connecting to DSRT servers...</p></>
        )}

        {state === 'ok' && (
          <><h1 className="text-[22px] font-bold text-white mb-2">Check-in Complete</h1>
            {details?.registration_number && <p className="text-[14px] font-mono text-[#93c5fd] font-bold bg-[#1e3a5f]/40 px-3 py-1.5 rounded-lg inline-block mb-3">{details.registration_number}</p>}
            <p className="text-[11px] font-mono text-white/50">{format(new Date(), 'MMM d, yyyy · h:mm a')}</p>
          </>
        )}

        {state === 'already' && (
          <><h1 className="text-[18px] font-bold text-white mb-2">Already Checked In</h1>
            {details?.registration_number && <p className="text-[13px] font-mono text-white/70 mb-2">{details.registration_number}</p>}
            {details?.checked_in_at && <p className="text-[11px] font-mono text-white/40">Timestamp: {format(new Date(details.checked_in_at), 'MMM d · h:mm a')}</p>}
          </>
        )}

        {state === 'error' && (
          <><h1 className="text-[18px] font-bold text-white mb-2">Check-in Failed</h1><p className="text-[13px] text-white/70">{error}</p></>
        )}

        <div className="mt-8 pt-6 border-t border-white/[0.08]">
          <DsrtButton asChild variant="ghost" size="sm">
            <Link href="/">Return to Platform</Link>
          </DsrtButton>
        </div>
      </DsrtPanel>
    </div>
  )
}