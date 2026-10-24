'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { CalendarClock, MapPin, Video, Users, ArrowLeft, Settings } from 'lucide-react'
import { ErrorState } from '@/components/kernel-ui'
import { useEvent } from '@/hooks/useEvents'
import { EventRegistrationButton } from './EventRegistrationButton'
import { formatNumber } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { DsrtPage, DsrtPanel, DsrtButton, DsrtSkeleton } from '@/components/dsrt'

interface Props {
  eventId: string
  communitySlug: string
  canManage?: boolean
}

export function EventDetailPage({ eventId, communitySlug, canManage }: Props) {
  const { data, loading, reload } = useEvent(eventId)
  const [myRegistration, setMyRegistration] = useState<any>(null)

  useEffect(() => {
    if (!eventId) return
    fetch(`/api/v1/events/${eventId}/registrations`)
      .then((r) => r.json())
      .then((j) => {
        const list = j?.data?.items || []
        setMyRegistration(list[0] || null)
      })
      .catch(() => setMyRegistration(null))
  }, [eventId])

  if (loading) return (
    <DsrtPage width="wide">
      <DsrtSkeleton className="h-6 w-24 mb-4" />
      <DsrtSkeleton className="h-96 w-full rounded-3xl" />
    </DsrtPage>
  )

  if (!data) return (
    <DsrtPage width="narrow">
      <DsrtPanel>
        <ErrorState title="Failed to load event" />
      </DsrtPanel>
    </DsrtPage>
  )

  const { event, schedules, locations, config } = data
  const schedule = schedules.find((s: any) => s.is_primary) || schedules[0]
  const location = locations.find((l: any) => l.is_primary) || locations[0]
  const starts = schedule?.starts_at ? new Date(schedule.starts_at) : null
  const ends = schedule?.ends_at ? new Date(schedule.ends_at) : null

  return (
    <DsrtPage width="wide" className="space-y-4 py-6">
      <Link
        href={`/community/${communitySlug}/events`}
        className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft size={14} /> Back to Events
      </Link>

      <DsrtPanel padding="none" className="overflow-hidden rounded-[24px]">
        {event.cover_url && (
          <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden bg-[#0f172a] border-b border-white/[0.04]">
            <img src={event.cover_url} alt="" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-transparent to-transparent" />
          </div>
        )}
        <div className="p-6 md:p-10 -mt-10 relative z-10">
          {starts && (
            <p className="text-[12px] font-mono font-bold uppercase tracking-widest text-[#93c5fd] mb-3 bg-[#1e3a5f]/80 backdrop-blur-md w-fit px-3 py-1.5 rounded-lg border border-[#2c5282]/50 shadow-lg">
              <CalendarClock className="w-4 h-4 inline mr-2" />
              {format(starts, 'EEEE, MMM d, yyyy · h:mm a')}
              {ends && ` — ${format(ends, 'h:mm a')}`}
            </p>
          )}
          <h1 className="text-[26px] md:text-[36px] font-bold text-white tracking-tight leading-tight max-w-4xl drop-shadow-lg">
            {event.title}
          </h1>
          {event.tagline && (
            <p className="mt-3 text-[15px] md:text-[17px] text-white/70 leading-relaxed max-w-3xl font-medium">
              {event.tagline}
            </p>
          )}

          <div className="mt-6 flex items-center gap-4 text-[13px] font-medium text-white/60 flex-wrap">
            {event.is_online && location?.meeting_url && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                <Video size={16} /> Online
              </span>
            )}
            {location?.city && (
              <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.08]">
                <MapPin size={16} />
                {[location.name, location.city, location.country].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.08]">
              <Users size={16} />
              {formatNumber(config?.confirmed_count || 0)}
              {config?.capacity ? ` / ${formatNumber(config.capacity)}` : ' registered'}
            </span>
          </div>

          <div className="mt-8 pt-8 border-t border-white/[0.06] flex items-center gap-3 flex-wrap">
            <EventRegistrationButton event={event} config={config} myRegistration={myRegistration} onChanged={reload} />
            {canManage && (
              <DsrtButton asChild variant="outline" size="md">
                <Link href={`/community/${communitySlug}/events/${event.slug}/manage`}>
                  <Settings size={16} className="mr-1.5" /> Manage Event
                </Link>
              </DsrtButton>
            )}
          </div>

          {event.description && (
            <div className="mt-10">
              <h3 className="text-[12px] font-mono font-bold uppercase tracking-wider text-white/40 mb-4">About this event</h3>
              <div className="prose prose-invert max-w-3xl text-[15px] text-white/80 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}
        </div>
      </DsrtPanel>
    </DsrtPage>
  )
}