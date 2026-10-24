'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ProfileCard } from '../../shared/ProfileCard'
import { cn } from '@/lib/utils'
import {
  Timer,
  Trophy,
  Rocket,
  CurrencyDollar,
  Sparkle,
  Flag,
  Confetti,
} from '@phosphor-icons/react'

interface JourneyEvent {
  id: string
  title: string
  description?: string | null
  category?: string | null
  event_date?: string | null
  entity_type?: string | null
  entity_id?: string | null
}

interface FounderJourneyProps {
  events: JourneyEvent[]
}

function iconForCategory(cat?: string | null): { Icon: any; color: string } {
  const c = (cat || '').toLowerCase()
  if (c.includes('funding')) return { Icon: CurrencyDollar, color: 'text-yellow-300' }
  if (c.includes('launch') || c.includes('product')) return { Icon: Rocket, color: 'text-orange-300' }
  if (c.includes('venture')) return { Icon: Flag, color: 'text-blue-300' }
  if (c.includes('acquisition') || c.includes('exit')) return { Icon: Confetti, color: 'text-purple-300' }
  if (c.includes('growth') || c.includes('milestone')) return { Icon: Sparkle, color: 'text-green-300' }
  if (c.includes('achievement')) return { Icon: Trophy, color: 'text-yellow-300' }
  return { Icon: Timer, color: 'text-zinc-400' }
}

export function FounderJourney({ events }: FounderJourneyProps) {
  if (events.length === 0) return null

  return (
    <ProfileCard>
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-4 h-4 text-zinc-500" weight="duotone" />
        <h2 className="text-[14px] font-bold text-zinc-100 tracking-tight">
          Founder Journey
        </h2>
        <span className="text-[10px] text-zinc-600 font-semibold">
          {events.length}
        </span>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-zinc-800/80" />

        <div className="space-y-4">
          {events.slice(0, 10).map((event) => {
            const { Icon, color } = iconForCategory(event.category)
            return (
              <div key={event.id} className="relative pl-6 group">
                {/* Timeline dot */}
                <div className={cn(
                  'absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-[#0a0a0b] shadow-[0_0_0_1px_rgba(59,130,246,0.3)]',
                  'bg-blue-500',
                )} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Icon className={cn('w-3.5 h-3.5', color)} weight="fill" />
                      <p className="text-[13px] font-bold text-zinc-100 leading-tight">
                        {event.title}
                      </p>
                    </div>
                    {event.description && (
                      <p className="text-[12px] text-zinc-500 mt-1 leading-snug line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.event_date && (
                      <p className="text-[10.5px] text-zinc-600 mt-1">
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {events.length > 10 && (
            <p className="text-[11px] text-zinc-600 text-center pt-2 pl-6">
              +{events.length - 10} more milestones
            </p>
          )}
        </div>
      </div>
    </ProfileCard>
  )
}