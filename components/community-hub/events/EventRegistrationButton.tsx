'use client'

import { useState, useTransition, useEffect } from 'react'
import { Check, Clock, Loader2, Lock, X, Ticket } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { DsrtButton, DsrtChip } from '@/components/dsrt'

interface Props {
  event: any
  config: any
  myRegistration?: any
  onChanged?: () => void
}

export function EventRegistrationButton({ event, config, myRegistration, onChanged }: Props) {
  const [pending, startTransition] = useTransition()
  const [local, setLocal] = useState(myRegistration || null)
  const [checkinToken, setCheckinToken] = useState<string | null>(null)

  useEffect(() => {
    setLocal(myRegistration || null)
  }, [myRegistration])

  const isCancelled = event.status === 'CANCELLED'
  
  const capacityFull = config?.capacity && (config.confirmed_count || 0) >= config.capacity
  const waitlistPossible = capacityFull && config?.waitlist_enabled
  
  const closesAt = config?.registration_closes_at ? new Date(config.registration_closes_at) : null
  const closed = closesAt && closesAt < new Date()

  const register = () => {
    startTransition(async () => {
      const res = await fetch(`/api/v1/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `reg-${event.id}-${Date.now()}` },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error?.message || 'Registration failed'); return }
      const d = json?.data
      setLocal({ status: d.status, registration_number: d.registration_number, waitlist_position: d.waitlist_position, id: d.registration_id })
      if (d.checkin_token) setCheckinToken(d.checkin_token)
      toast.success(d.status === 'CONFIRMED' ? `Registered · ${d.registration_number}` : 'You are on the waitlist')
      onChanged?.()
    })
  }

  const cancel = () => {
    if (!local?.id) return
    if (!confirm('Cancel your registration?')) return
    startTransition(async () => {
      const res = await fetch(`/api/v1/events/registrations/${local.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'user_cancelled' }),
      })
      if (!res.ok) { toast.error('Cancel failed'); return }
      setLocal(null); setCheckinToken(null)
      toast.success('Registration cancelled')
      onChanged?.()
    })
  }

  if (isCancelled) {
    return (
      <DsrtButton variant="danger" disabled>
        <X className="w-3.5 h-3.5 mr-1" /> Event cancelled
      </DsrtButton>
    )
  }

  if (local?.status === 'CONFIRMED' || local?.status === 'ATTENDED') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <DsrtChip tone="success" size="md">
          <Check className="w-3 h-3" strokeWidth={2} />
          {local.status === 'ATTENDED' ? 'Checked in' : 'Registered'}
          {local.registration_number && <span className="ml-1 opacity-70">#{local.registration_number}</span>}
        </DsrtChip>
        
        {checkinToken && (
          <a
            href={`/checkin/${checkinToken}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[12px] font-semibold text-white transition-colors"
          >
            <Ticket className="w-3.5 h-3.5" /> View ticket
          </a>
        )}
        
        {config?.allow_cancellation !== false && local.status !== 'ATTENDED' && (
          <button onClick={cancel} className="text-[12px] font-medium text-white/50 hover:text-white transition-colors">
            Cancel
          </button>
        )}
      </div>
    )
  }

  if (local?.status === 'WAITLISTED') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <DsrtChip tone="warning" size="md">
          <Clock className="w-3 h-3" /> Waitlisted
          {local.waitlist_position && <span className="ml-1 opacity-70">#{local.waitlist_position}</span>}
        </DsrtChip>
        <button onClick={cancel} className="text-[12px] font-medium text-white/50 hover:text-white transition-colors">
          Leave waitlist
        </button>
      </div>
    )
  }

  if (closed || config?.registration_mode === 'CLOSED') {
    return (
      <DsrtButton variant="ghost" disabled className="bg-white/[0.02]">
        <Lock className="w-3.5 h-3.5 mr-1" /> Closed
      </DsrtButton>
    )
  }

  // FIXED: isFull variable reference error
  const willWaitlist = capacityFull && config?.allow_waitlist !== false

  return (
    <DsrtButton variant="primary" onClick={register} loading={pending}>
      <Ticket className="w-3.5 h-3.5 mr-1" />
      {capacityFull ? (willWaitlist ? 'Join waitlist' : 'Event full') : 'Register'}
    </DsrtButton>
  )
}