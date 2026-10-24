// filepath: components/mail/MailTabs.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { User, RocketLaunch, Buildings, UsersThree } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export type MailTab = 'personal' | 'projects' | 'ventures' | 'network'

interface Props {
  activeTab: MailTab
  onTabChange: (tab: MailTab) => void
}

const TABS: Array<{
  key: MailTab
  label: string
  sublabel: string
  icon: any
}> = [
  { key: 'personal', label: 'Personal', sublabel: 'Direct & important', icon: User },
  { key: 'network', label: 'Network', sublabel: 'Community & networking', icon: UsersThree },
  { key: 'projects', label: 'Projects', sublabel: 'Project communication', icon: RocketLaunch },
  { key: 'ventures', label: 'Ventures', sublabel: 'Venture & business', icon: Buildings },
]

export function MailTabs({ activeTab, onTabChange }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const supabaseRef = useRef(createClient())

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/mail/tab-counts')
      const d = await res.json()
      setCounts(d.counts || {})
    } catch {}
  }, [])

  useEffect(() => {
    fetchCounts()
    const supabase = supabaseRef.current
    const channelName = `mail_tab_counts:${Math.random().toString(36).slice(2, 9)}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mail_thread_participants' }, () => fetchCounts())
      .subscribe()

    const refresh = () => fetchCounts()
    window.addEventListener('mail:refresh', refresh)
    return () => {
      window.removeEventListener('mail:refresh', refresh)
      supabase.removeChannel(channel)
    }
  }, [fetchCounts])

  return (
    <div className="border-b border-white/[0.06] bg-gradient-to-b from-[#0A0C13] to-[#08090F]">
      {/* Mobile: horizontal scrollable pills with proper container padding */}
      <div className="lg:hidden w-full overflow-x-auto scrollbar-hide px-4 py-2.5">
        <div className="flex items-center gap-2.5 w-max pr-4">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            const count = counts[tab.key] || 0
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-4 rounded-full shrink-0',
                  'text-[13px] font-semibold transition-all border',
                  active
                    ? 'bg-white text-black border-white shadow-[0_2px_8px_rgba(255,255,255,0.15)]'
                    : 'bg-white/[0.04] text-white/65 border-white/[0.08] hover:bg-white/[0.08] hover:text-white'
                )}
              >
                <Icon className="w-[15px] h-[15px]" weight={active ? 'duotone' : 'regular'} />
                <span className="leading-none">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center leading-none',
                      active ? 'bg-black/15 text-black' : 'bg-white/[0.1] text-white/75'
                    )}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop logic remains unchanged */}
      <div className="hidden lg:grid grid-cols-4">
        {TABS.map((tab, idx) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          const count = counts[tab.key] || 0
          const isLast = idx === TABS.length - 1

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'relative flex items-center gap-3 px-4 py-3 group transition-all',
                !isLast && 'border-r border-white/[0.04]',
                active ? 'bg-gradient-to-b from-white/[0.05] to-transparent' : 'hover:bg-white/[0.02]'
              )}
            >
              {active && <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#4F7CFF] rounded-t" />}

              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all',
                  active
                    ? 'bg-[#4F7CFF]/15 border-[#4F7CFF]/30'
                    : 'bg-white/[0.02] border-white/[0.05] group-hover:bg-white/[0.05]'
                )}
              >
                <Icon
                  className={cn(
                    'w-[16px] h-[16px] transition-colors',
                    active ? 'text-[#93c5fd]' : 'text-white/45 group-hover:text-white/75'
                  )}
                  weight={active ? 'duotone' : 'regular'}
                />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'text-[13px] font-bold tracking-tight transition-colors',
                      active ? 'text-white' : 'text-white/70 group-hover:text-white/90'
                    )}
                  >
                    {tab.label}
                  </p>
                  {count > 0 && (
                    <span
                      className={cn(
                        'text-[9.5px] font-bold px-1.5 h-[15px] flex items-center rounded',
                        active ? 'bg-[#4F7CFF] text-white' : 'bg-white/[0.08] text-white/70'
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-[10.5px] mt-0.5 truncate transition-colors',
                    active ? 'text-white/55' : 'text-white/35'
                  )}
                >
                  {tab.sublabel}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}