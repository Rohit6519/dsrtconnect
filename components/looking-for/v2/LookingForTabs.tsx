// filepath: components/looking-for/v2/LookingForTabs.tsx
'use client'

import { 
  Compass, 
  Briefcase, 
  BookmarkSimple, 
  Lightbulb, 
  Users, 
  SquaresFour 
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export type TabId =
  | 'explore'
  | 'applications'
  | 'saved'
  | 'suggested'
  | 'people'
  | 'categories'

interface Props {
  active: TabId
  onChange: (t: TabId) => void
}

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'applications', label: 'Applications', icon: Briefcase },
  { id: 'saved', label: 'Saved', icon: BookmarkSimple },
  { id: 'suggested', label: 'Suggested', icon: Lightbulb },
  { id: 'people', label: 'People', icon: Users },
  { id: 'categories', label: 'Categories', icon: SquaresFour },
]

export function LookingForTabs({ active, onChange }: Props) {
  return (
    <div className="relative border-b border-white/[0.06]">
      {/* Fixed grid — no scrolling on desktop. Only scrolls on very small phones. */}
      <div className="flex sm:grid sm:grid-cols-6 items-stretch gap-1 sm:gap-2 overflow-x-auto sm:overflow-visible scrollbar-hide px-1 py-1">
        {TABS.map((t) => {
          const isActive = active === t.id
          const Icon = t.icon

          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'relative flex flex-col items-center justify-start gap-2',
                'min-w-[76px] sm:min-w-0 flex-1 shrink-0',
                'pt-2.5 pb-3.5 group transition-all outline-none'
              )}
            >
              {/* 3D Padded Icon Box */}
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
                  'border relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-b from-[#1F1A0A] to-[#0A0D14] border-[#FBBF24]/40 shadow-[0_8px_20px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'bg-gradient-to-b from-[#12141C] to-[#08090F] border-white/[0.08] shadow-[0_6px_14px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] group-hover:border-white/[0.16] group-hover:from-[#171923]'
                )}
              >
                {/* Inner top highlight for 3D effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-white opacity-[0.08]" />

                <Icon
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-300',
                    isActive
                      ? 'text-[#FBBF24]'
                      : 'text-white/50 group-hover:text-white/80'
                  )}
                  weight={isActive ? 'fill' : 'bold'}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-[11.5px] font-semibold tracking-wide transition-colors leading-none',
                  isActive ? 'text-white' : 'text-white/45 group-hover:text-white/75'
                )}
              >
                {t.label}
              </span>

              {/* Active Bottom Indicator Glow */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-t-full bg-[#FBBF24] shadow-[0_-1px_10px_rgba(251,191,36,0.6)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}