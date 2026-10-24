'use client'

import { Plus, ClockClockwise, Rocket, Star, Users, TrendUp, CurrencyDollar, Globe } from '@phosphor-icons/react'

const EVENT_ICONS: Record<string, any> = {
  founded: Rocket, milestone: Star, team: Users,
  product: TrendUp, funding: CurrencyDollar, expansion: Globe, general: ClockClockwise
}

const EVENT_COLORS: Record<string, string> = {
  founded: 'text-purple-300 bg-purple-500/10',
  milestone: 'text-orange-300 bg-orange-500/10',
  team: 'text-emerald-300 bg-emerald-500/10',
  product: 'text-blue-300 bg-blue-500/10',
  funding: 'text-green-300 bg-green-500/10',
  expansion: 'text-cyan-300 bg-cyan-500/10',
  general: 'text-white/70 bg-white/[0.06]',
}

interface Props {
  venture: any
  events: any[]
  slug: string
  isOwner: boolean
}

export function VentureTimeline({ venture, events, slug, isOwner }: Props) {
  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-white">Company Timeline</h2>
          <p className="text-[12.5px] text-white/45 mt-0.5">Your journey so far</p>
        </div>
        {isOwner && (
          <button className="text-[12.5px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 h-9 rounded-lg flex items-center gap-1.5">
            <Plus size={13} weight="bold" /> Add Event
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/[0.06] items-center justify-center mb-4">
            <ClockClockwise size={26} className="text-white/40" />
          </div>
          <p className="text-[15px] font-semibold text-white">No timeline events</p>
          <p className="text-[12.5px] text-white/45 mt-1 max-w-sm mx-auto">
            {isOwner ? 'Document your company\'s milestones and journey.' : 'This venture hasn\'t added timeline events.'}
          </p>
          {isOwner && (
            <button className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-lg">
              <Plus size={12} weight="bold" /> Add first event
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-4 bottom-4 w-px bg-gradient-to-b from-purple-500/40 via-white/[0.08] to-white/[0.04]" />
          <div className="space-y-4">
            {events.map((event) => {
              const Icon = EVENT_ICONS[event.event_type] || EVENT_ICONS.general
              const colorClass = EVENT_COLORS[event.event_type] || EVENT_COLORS.general
              return (
                <div key={event.id} className="flex gap-4 relative">
                  <div className={'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 border-2 border-[#0a0a0f] ' + colorClass}>
                    <Icon size={14} weight="fill" />
                  </div>
                  <div className="flex-1 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[14px] font-bold text-white">{event.title}</h3>
                        <p className="text-[11px] text-white/45 mt-0.5">
                          {new Date(event.event_date).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={'text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ' + colorClass}>
                        {event.event_type}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-[12.5px] text-white/70 leading-relaxed mt-2">{event.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
