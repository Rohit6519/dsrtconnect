'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Clock, X, QrCode, Ticket, Lock } from 'lucide-react'
import { DsrtButton, DsrtPanel, DsrtEmpty } from '@/components/dsrt'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  event: any
  config: any
  myRegistration: any
  onChanged?: () => void
}

export function RegisterPanel({ event, config, myRegistration, onChanged }: Props) {
  const [pending, startTransition] = useTransition()
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)

  const capacityFull = config?.capacity && (config.confirmed_count || 0) >= config.capacity
  const waitlistPossible = capacityFull && config?.waitlist_enabled
  const isCancelled = event.status === 'CANCELLED'
  const isEnded = event.status === 'ENDED' || event.status === 'ARCHIVED'
  const registrationOpen = event.status === 'REGISTRATION_OPEN' || event.status === 'SCHEDULED'
  const registrationClosed = !registrationOpen

  const register = () => {
    startTransition(async () => {
      const res = await fetch(`/api/v1/community/events/${event.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `evt-reg-${event.id}-${Date.now()}`,
        },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error?.message || 'Registration failed'); return }
      const d = json?.data
      if (d?.qr_url) {
        const t = d.qr_url.split('/').pop()
        setQrToken(t || null)
      }
      toast.success(
        d?.already_registered
          ? 'You are already registered'
          : d?.status === 'CONFIRMED'
          ? "You're in!"
          : `Waitlist position: #${d?.waitlist_position ?? '?'}`
      )
      onChanged?.()
    })
  }

  const cancel = () => {
    if (!confirm('Cancel your registration?')) return
    startTransition(async () => {
      const res = await fetch(`/api/v1/community/events/registrations/${myRegistration.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'user_cancelled' }),
      })
      if (!res.ok) { toast.error('Cancel failed'); return }
      toast.message('Registration cancelled')
      onChanged?.()
    })
  }

  const fetchQrToken = async () => {
    setQrOpen(true)
    if (qrToken) return
    const res = await fetch(`/api/v1/community/events/${event.id}/registrations/self/qr`, { method: 'POST' })
    const json = await res.json()
    if (res.ok) setQrToken(json?.data?.token || null)
  }

  return (
    <DsrtPanel padding="md">
      {config?.capacity && (
        <div className="mb-5">
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2">
            <span>Registered</span>
            <span className="text-white/80">
              {config.confirmed_count || 0} / {config.capacity}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all ${capacityFull ? 'bg-amber-400' : 'bg-gradient-to-r from-[#1e3a5f] to-[#2c5282]'}`}
              style={{ width: `${Math.min(100, ((config.confirmed_count || 0) / config.capacity) * 100)}%` }}
            />
          </div>
          {(config.waitlist_count || 0) > 0 && (
            <p className="mt-2 text-[10px] font-mono text-white/40">{config.waitlist_count} on waitlist</p>
          )}
        </div>
      )}

      {/* FIXED: The closing tag issue previously flagged was due to nested conditionals formatting. Resolved by flat mapping below. */}
      {(() => {
        if (isCancelled) {
          return <DsrtButton variant="danger" fullWidth disabled><X size={14} className="mr-1.5" /> Event Cancelled</DsrtButton>
        }
        if (isEnded) {
          return <DsrtButton variant="outline" fullWidth disabled>Event Ended</DsrtButton>
        }
        if (myRegistration) {
          if (myRegistration.status === 'CONFIRMED') {
            return (
              <div className="space-y-3">
                <div className="text-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <Check className="w-5 h-5 text-emerald-400 mx-auto mb-1" strokeWidth={2} />
                  <p className="text-[13px] font-bold text-emerald-400">You're Registered</p>
                  {myRegistration.registration_number && <p className="mt-1 text-[11px] font-mono text-emerald-400/70">#{myRegistration.registration_number}</p>}
                </div>
                {config?.checkin_enabled && (
                  <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                    <DialogTrigger asChild>
                      <DsrtButton variant="primary" fullWidth onClick={fetchQrToken}><QrCode size={14} className="mr-1.5" /> Show QR Ticket</DsrtButton>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0a0f] border-white/[0.1] text-white p-6 max-w-sm rounded-2xl">
                      <div className="text-center space-y-4">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-1">Check-in Ticket</p>
                          <p className="text-[16px] font-bold text-white leading-tight">{event.title}</p>
                          <p className="mt-0.5 text-[11px] font-mono text-white/50">{myRegistration.registration_number}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl inline-block mx-auto">
                          {qrToken ? <QRCodeSVG value={typeof window !== 'undefined' ? `${window.location.origin}/checkin/${qrToken}` : qrToken} size={200} level="H" /> : <Loader2 className="w-6 h-6 animate-spin text-black mx-auto" />}
                        </div>
                        <p className="text-[12px] text-white/50">Show this QR code to event staff at the door.</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                <DsrtButton variant="ghost" fullWidth onClick={cancel} disabled={pending} className="text-white/40 hover:text-red-400">Cancel Registration</DsrtButton>
              </div>
            )
          }
          if (myRegistration.status === 'WAITLISTED') {
            return (
              <div className="space-y-3">
                <div className="text-center rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-[13px] font-bold text-amber-400">On Waitlist</p>
                </div>
                <DsrtButton variant="ghost" fullWidth onClick={cancel} disabled={pending}>Leave Waitlist</DsrtButton>
              </div>
            )
          }
        }
        if (registrationClosed) {
          return <DsrtButton variant="outline" fullWidth disabled><Lock size={14} className="mr-1.5" /> Registration Closed</DsrtButton>
        }
        if (config?.registration_mode === 'CLOSED') {
          return <DsrtButton variant="outline" fullWidth disabled><Lock size={14} className="mr-1.5" /> Closed</DsrtButton>
        }
        return (
          <DsrtButton variant={capacityFull ? 'outline' : 'primary'} fullWidth onClick={register} loading={pending}>
            <Ticket size={14} className="mr-1.5" /> {capacityFull ? (waitlistPossible ? 'Join Waitlist' : 'Event Full') : 'Register Now'}
          </DsrtButton>
        )
      })()}
    </DsrtPanel>
  )
}