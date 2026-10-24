'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { CalendarClock, MapPin, Video, Users } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { DsrtPanel } from '@/components/dsrt'

interface Props {
  event: any
  communitySlug: string
}

export function EventCard({ event, communitySlug }: Props) {
  const schedule = (event.event_schedules || []).find((s: any) => s.is_primary) || (event.event_schedules || [])[0]
  const location = (event.event_locations || []).find((l: any) => l.is_primary) || (event.event_locations || [])[0]
  const config = event.event_registration_config || {}
  const starts = schedule?.starts_at ? new Date(schedule.starts_at) : null
  const remaining = config?.capacity != null ? Math.max(0, config.capacity - (config.confirmed_count || 0)) : null

  return (
    <Link href={`/community/${communitySlug}/events/${event.slug || event.id}`} className="block h-full group">
      <DsrtPanel padding="none" className="h-full hover:border-white/[0.16] transition-colors overflow-hidden flex flex-col group-hover:-translate-y-0.5">
        {event.cover_url && (
          <div className="relative h-32 md:h-40 overflow-hidden bg-[#0a0f1a] border-b border-white/[0.04]">
            <img src={event.cover_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-[#05070D]/20 to-transparent" />
          </div>
        )}
        <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col">
          {starts && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#93c5fd]">
              <CalendarClock className="w-3 h-3" strokeWidth={2} />
              {format(starts, 'EEE, MMM d · h:mm a')}
            </div>
          )}
          <h3 className="text-[16px] font-bold text-white leading-tight group-hover:text-[#93c5fd] transition-colors">{event.title}</h3>
          
          {event.tagline && (
            <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2">{event.tagline}</p>
          )}

          <div className="mt-auto pt-4 border-t border-white/[0.04] flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-mono text-white/40">
            {event.is_online && location?.meeting_url && (
              <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" /> Online</span>
            )}
            {location?.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {location.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1 ml-auto">
              <Users className="w-3 h-3" />
              {formatNumber(config.confirmed_count || 0)}
              {config.capacity ? ` / ${formatNumber(config.capacity)}` : ''}
            </span>
          </div>

          {remaining != null && remaining <= 5 && remaining > 0 && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded w-fit mt-2">
              {remaining} seat{remaining === 1 ? '' : 's'} left
            </p>
          )}
        </div>
      </DsrtPanel>
    </Link>
  )
}