'use client'

import { CalendarDays, MapPin, Video, Users } from 'lucide-react'
import { format } from 'date-fns'
import type { CommunityDetail } from '@/hooks/useCommunityDetail'
import { useCommunityEvents } from '@/hooks/useCommunityDetail'
import { formatNumber } from '@/lib/utils'
import { DsrtPanel, DsrtSection, DsrtEmpty, DsrtSkeleton, DsrtGrid } from '@/components/dsrt'
import Link from 'next/link'

export function EventsTab({ detail }: { detail: CommunityDetail }) {
  const { data, loading } = useCommunityEvents(detail.community.slug)

  if (loading) {
    return (
      <DsrtGrid cols={{ base: 1, md: 2 }}>
        <DsrtSkeleton className="h-40 w-full rounded-2xl" />
        <DsrtSkeleton className="h-40 w-full rounded-2xl" />
      </DsrtGrid>
    )
  }

  const empty = data.upcoming.length === 0 && data.past.length === 0

  if (empty) {
    return (
      <DsrtPanel>
        <DsrtEmpty
          icon={CalendarDays}
          title="No events scheduled"
          description="When this community schedules events, they'll appear here."
        />
      </DsrtPanel>
    )
  }

  return (
    <div className="space-y-8">
      {data.upcoming.length > 0 && (
        <DsrtSection title="Upcoming Events" headerVariant="mono">
          <DsrtGrid cols={{ base: 1, md: 2 }}>
            {data.upcoming.map((e: any) => (
              <EventPreviewCard key={e.id} event={e} communitySlug={detail.community.slug} />
            ))}
          </DsrtGrid>
        </DsrtSection>
      )}

      {data.past.length > 0 && (
        <DsrtSection title="Past Events" headerVariant="mono">
          <DsrtGrid cols={{ base: 1, md: 2 }}>
            {data.past.map((e: any) => (
              <EventPreviewCard key={e.id} event={e} past communitySlug={detail.community.slug} />
            ))}
          </DsrtGrid>
        </DsrtSection>
      )}
    </div>
  )
}

function EventPreviewCard({ event, past, communitySlug }: { event: any; past?: boolean; communitySlug: string }) {
  const cover = event.cover_image || event.banner_url
  
  return (
    <Link href={`/community/${communitySlug}/events/${event.slug || event.id}`} className="block h-full group">
      <DsrtPanel padding="none" className="h-full flex flex-col group-hover:border-white/[0.14] transition-colors">
        {cover && (
          <div className="relative h-32 bg-[#05070D] border-b border-white/[0.04] overflow-hidden">
            <img src={cover} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-[#05070D]/20 to-transparent" />
          </div>
        )}
        <div className="p-4 sm:p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-white/50 mb-2">
            <span>{format(new Date(event.start_time), 'EEE · MMM d · h:mm a')}</span>
            {past && (
              <>
                <span className="opacity-40">·</span>
                <span>Past</span>
              </>
            )}
          </div>
          <h4 className="text-[15px] font-bold text-white leading-tight group-hover:text-[#93c5fd] transition-colors line-clamp-2 mb-2">
            {event.title}
          </h4>
          {event.description && (
            <p className="text-[13px] text-white/60 line-clamp-2 leading-relaxed mb-4">
              {event.description}
            </p>
          )}
          <div className="mt-auto flex items-center gap-4 flex-wrap text-[12px] font-medium text-white/50 pt-2 border-t border-white/[0.04]">
            {event.is_online ? (
              <span className="inline-flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Online</span>
            ) : event.location ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 ml-auto">
              <Users className="w-3.5 h-3.5" />
              {formatNumber(event.attendee_count || 0)}
              {event.max_attendees ? ` / ${formatNumber(event.max_attendees)}` : ''}
            </span>
          </div>
        </div>
      </DsrtPanel>
    </Link>
  )
}