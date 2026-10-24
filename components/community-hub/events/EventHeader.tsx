'use client'

import { format } from 'date-fns'
import { Calendar, MapPin, Video, Clock, Users } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import { DsrtPanel } from '@/components/dsrt'

export function EventHeader({ event, config }: { event: any; config: any }) {
  const cover = event.cover_url || event.banner_url
  const start = new Date(event.starts_at)

  return (
    <DsrtPanel padding="none" className="overflow-hidden rounded-2xl md:rounded-3xl">
      <div className="relative h-40 sm:h-56 md:h-72 bg-gradient-to-br from-[#0f172a] to-[#0a0a0f] border-b border-white/[0.04]">
        {cover && <img src={cover} alt="" className="w-full h-full object-cover opacity-90" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-[#05070D]/20 to-transparent" />
      </div>
      
      <div className="px-5 sm:px-8 py-6 -mt-12 sm:-mt-16 relative z-10">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#93c5fd] mb-2 bg-[#1e3a5f]/80 backdrop-blur-md w-fit px-2.5 py-1 rounded-md border border-[#2c5282]/50 shadow-sm">
          <Calendar className="w-3.5 h-3.5" />
          {format(start, 'EEE, MMM d · h:mm a')} · {event.timezone}
        </div>
        
        <h1 className="text-[24px] sm:text-[32px] md:text-[36px] font-bold text-white tracking-tight leading-tight drop-shadow-md">
          {event.title}
        </h1>
        
        {event.tagline && (
          <p className="mt-2.5 text-[14px] sm:text-[15px] md:text-[16px] font-medium text-white/70 leading-relaxed max-w-3xl">
            {event.tagline}
          </p>
        )}
        
        <div className="mt-5 pt-5 border-t border-white/[0.08] flex items-center gap-4 flex-wrap text-[12px] font-mono text-white/50">
          {event.is_online ? (
            <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08]">
              <Video className="w-3.5 h-3.5 text-white/70" /> Online Event
            </span>
          ) : event.location_text ? (
            <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08]">
              <MapPin className="w-3.5 h-3.5 text-white/70" /> {event.location_text}
            </span>
          ) : null}
          
          {event.ends_at && (
            <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08]">
              <Clock className="w-3.5 h-3.5 text-white/70" /> Ends {format(new Date(event.ends_at), 'h:mm a')}
            </span>
          )}
          
          {config?.capacity && (
            <span className="inline-flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08]">
              <Users className="w-3.5 h-3.5 text-white/70" />
              {formatNumber(config.confirmed_count || 0)} / {formatNumber(config.capacity)} joined
            </span>
          )}
        </div>
      </div>
    </DsrtPanel>
  )
}