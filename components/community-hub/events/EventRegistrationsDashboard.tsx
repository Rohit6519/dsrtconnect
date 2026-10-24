'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QrCode, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { ErrorState } from '@/components/kernel-ui'
import { format } from 'date-fns'
import { useEventRegistrations, useEventDetail } from '@/hooks/useCommunityEvents'
import { DsrtSection, DsrtTabs, DsrtPanel, DsrtGrid, DsrtSkeleton, DsrtEmpty, DsrtButton, DsrtAvatar, DsrtRowSkeleton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Props {
  slug: string
  eventId: string
}

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: 'text-emerald-300',
  WAITLISTED: 'text-amber-300',
  PENDING: 'text-[#93c5fd]',
  CANCELLED: 'text-white/40',
  REMOVED: 'text-white/40',
}

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'WAITLISTED', label: 'Waitlist' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function EventRegistrationsDashboard({ slug, eventId }: Props) {
  const [status, setStatus] = useState('ALL')
  const { data: eventData, loading: eventLoading } = useEventDetail(eventId)
  const { items, loading, error, reload } = useEventRegistrations(eventId, status)
  const [busy, setBusy] = useState<string | null>(null)

  const checkin = async (regId: string) => {
    setBusy(regId)
    try {
      const res = await fetch(`/api/v1/community/events/registrations/${regId}/manual-checkin`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error?.message || 'Check-in failed'); return }
      toast.success(json?.data?.already_checked_in ? 'Already checked in' : 'Checked in')
      reload()
    } finally { setBusy(null) }
  }

  if (eventLoading) return <DsrtSkeleton className="h-24 w-full rounded-xl" />
  if (!eventData) return null

  const config = eventData.config || {}
  const checkedIn = items.filter((r: any) => r.attendance).length

  return (
    <div className="space-y-6">
      <DsrtGrid cols={{ base: 2, lg: 4 }}>
        <Tile label="Confirmed" value={config.confirmed_count || 0} />
        <Tile label="Waitlist" value={config.waitlist_count || 0} />
        <Tile label="Checked In" value={checkedIn} />
        <Tile label="Capacity" value={config.capacity ?? '∞'} />
      </DsrtGrid>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <DsrtSection title="Registrations" description="Manage attendees and manual check-in." headerVariant="large" />
        <DsrtTabs variant="segmented" tabs={FILTERS} activeValue={status} onValueChange={setStatus} className="w-full md:w-auto overflow-x-auto" />
      </div>

      {loading ? (
        <DsrtPanel><DsrtRowSkeleton count={5} /></DsrtPanel>
      ) : error ? (
        <DsrtPanel><ErrorState errorCode={error} onRetry={reload} /></DsrtPanel>
      ) : items.length === 0 ? (
        <DsrtPanel><DsrtEmpty title="No registrations" description="No attendees match this filter." /></DsrtPanel>
      ) : (
        <DsrtPanel padding="none" className="overflow-hidden">
          <div className="hidden lg:grid grid-cols-[minmax(220px,2fr)_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Attendee</div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Registered At</div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">Status</div>
            <div />
          </div>
          
          <div className="divide-y divide-white/[0.04]">
            {items.map((r: any) => {
              const u = r.user
              const attended = !!r.attendance
              return (
                <div key={r.id} className="grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(220px,2fr)_1fr_1fr_120px] gap-4 items-center px-4 lg:px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  
                  <div className="flex items-center gap-3 min-w-0">
                    <DsrtAvatar src={u?.avatar_url} name={u?.full_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/profile/${u?.username || ''}`} className="text-[13.5px] font-bold text-white hover:text-[#93c5fd] transition-colors flex items-center gap-1.5 truncate">
                        {u?.full_name || 'Unknown'}
                        {u?.is_verified && <ShieldCheck className="w-3 h-3 text-[#93c5fd]" />}
                      </Link>
                      <p className="text-[11px] font-mono text-white/40 truncate mt-0.5">
                        #{r.registration_number || '---'}
                      </p>
                    </div>
                  </div>

                  <div className="hidden lg:block text-[11px] font-mono text-white/60">
                    {format(new Date(r.registered_at), 'MMM d, h:mm a')}
                  </div>

                  <div className="hidden lg:flex flex-col gap-0.5 justify-center">
                    <span className={cn('text-[11px] font-mono uppercase tracking-wider font-bold', STATUS_TONE[r.status] || 'text-white/60')}>
                      {r.status}
                    </span>
                    {attended && <span className="text-[10px] font-mono text-emerald-400">Checked in {format(new Date(r.attendance.checked_in_at), 'h:mm a')}</span>}
                  </div>

                  <div className="flex items-center justify-end">
                    {r.status === 'CONFIRMED' && !attended && (
                      <DsrtButton size="xs" variant="outline" loading={busy === r.id} onClick={() => checkin(r.id)}>
                        <QrCode size={12} className="mr-1" /> Check In
                      </DsrtButton>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DsrtPanel>
      )}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: any }) {
  return (
    <DsrtPanel padding="md">
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-[24px] font-bold text-white">{value}</p>
    </DsrtPanel>
  )
}