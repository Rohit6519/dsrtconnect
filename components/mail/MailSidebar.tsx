// filepath: components/mail/MailSidebar.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Tray,
  Star,
  Clock,
  PaperPlaneTilt,
  FileText,
  CalendarBlank,
  Trash,
  ShieldSlash,
  PencilSimple,
  Bell,
  Files,
  UsersThree,
  CheckCircle,
  HourglassMedium,
  EnvelopeOpen,
  Archive,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useMailIdentity, useOnIdentityChange } from './hooks/useMailIdentity'
import { DsrtButton } from '@/components/dsrt'

interface Props {
  activeFolder: string
  onFolderChange: (folder: string) => void
  onComposeClick: () => void
  mobile?: boolean
}

const MAIN_FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Tray, countKey: 'inbox', showBadge: true },
  { key: 'starred', label: 'Starred', icon: Star, countKey: 'starred', showBadge: true },
  { key: 'snoozed', label: 'Snoozed', icon: Clock, countKey: 'snoozed', showBadge: true },
  { key: 'sent', label: 'Sent', icon: PaperPlaneTilt, countKey: 'sent', showBadge: false },
  { key: 'drafts', label: 'Drafts', icon: FileText, countKey: 'drafts', showBadge: false, showCount: true },
  { key: 'scheduled', label: 'Scheduled', icon: CalendarBlank, countKey: 'scheduled', showBadge: false, showCount: true },
  { key: 'archive', label: 'Archive', icon: Archive, countKey: 'archive', showBadge: false },
  { key: 'all', label: 'All Mail', icon: Files, countKey: 'all', showBadge: false },
  { key: 'quarantine', label: 'Quarantine', icon: ShieldSlash, countKey: 'quarantine', showBadge: true, warningBadge: true },
  { key: 'spam', label: 'Spam', icon: ShieldSlash, countKey: 'spam', showBadge: true },
  { key: 'trash', label: 'Trash', icon: Trash, countKey: 'trash', showBadge: false },
]

const SMART_VIEWS = [
  { key: 'important', label: 'Important', icon: Bell, countKey: 'important', showBadge: true },
  { key: 'action_required', label: 'Action Required', icon: CheckCircle, countKey: 'action_required', showBadge: true },
  { key: 'awaiting_reply', label: 'Awaiting Reply', icon: HourglassMedium, countKey: 'awaiting_reply', showBadge: true },
  { key: 'unread', label: 'Unread', icon: EnvelopeOpen, countKey: 'unread', showBadge: true },
  { key: 'with_attachments', label: 'With Attachments', icon: Files, countKey: 'with_attachments', showBadge: false, showCount: true },
  { key: 'shared_with_me', label: 'Shared With Me', icon: UsersThree, countKey: 'shared_with_me', showBadge: true },
]

export function MailSidebar({ activeFolder, onFolderChange, onComposeClick, mobile = false }: Props) {
  const { activeIdentity, isUnified } = useMailIdentity()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const supabaseRef = useRef(createClient())

  const fetchCounts = useCallback(async () => {
    const identityId = isUnified
      ? 'unified'
      : (typeof activeIdentity === 'object' && activeIdentity !== null
          ? activeIdentity.identity_id
          : '')
    if (!identityId) return
    try {
      const res = await fetch(`/api/mail/counts?identity_id=${identityId}`, { cache: 'no-store' })
      const d = await res.json()
      setCounts(d.counts || {})
    } catch (e) {
      console.error('Count fetch error:', e)
    }
  }, [activeIdentity, isUnified])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useOnIdentityChange(() => {
    fetchCounts()
  })

  useEffect(() => {
    const supabase = supabaseRef.current
    const channelName = `mail_sidebar_counts:${Math.random().toString(36).slice(2, 9)}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mail_thread_participants' }, () => fetchCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mail_messages' }, () => fetchCounts())
      .subscribe()

    const refresh = () => fetchCounts()
    window.addEventListener('mail:refresh', refresh)
    window.addEventListener('mail:counts:refresh', refresh)

    return () => {
      window.removeEventListener('mail:refresh', refresh)
      window.removeEventListener('mail:counts:refresh', refresh)
      supabase.removeChannel(channel)
    }
  }, [fetchCounts])

  const renderItem = (item: any) => {
    const Icon = item.icon
    const active = activeFolder === item.key
    const count = item.countKey ? counts[item.countKey] || 0 : 0
    const showBadge = item.showBadge && count > 0
    const showCount = item.showCount && count > 0

    return (
      <button
        key={item.key}
        onClick={() => onFolderChange(item.key)}
        className={cn(
          'w-full flex items-center gap-3 pl-3 pr-2.5 h-10 rounded-lg text-[13px] font-medium transition-all group relative',
          active
            ? 'bg-gradient-to-r from-[#1e3a5f]/80 to-[#2c5282]/50 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
        )}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#4F7CFF]" />
        )}
        <Icon
          className={cn(
            'w-[16px] h-[16px] flex-shrink-0',
            active
              ? 'text-white'
              : item.warningBadge
              ? 'text-amber-400/80'
              : 'text-white/45 group-hover:text-white/75'
          )}
          weight={active ? 'duotone' : 'regular'}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {showBadge && (
          <span
            className={cn(
              'text-[10px] font-bold px-1.5 h-[18px] min-w-[20px] flex items-center justify-center rounded-full',
              item.warningBadge
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : active
                ? 'bg-white text-[#1e3a5f]'
                : 'bg-white/[0.08] text-white/80'
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
        {showCount && (
          <span className={cn('text-[11px] font-mono', active ? 'text-white/70' : 'text-white/40')}>{count}</span>
        )}
      </button>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col overflow-y-auto scrollbar-hide',
        mobile
          ? 'w-full'
          : 'w-[248px] flex-shrink-0 border-r border-white/[0.06] bg-gradient-to-b from-[#08090F] to-[#05070D]'
      )}
    >
      <div className="p-3 space-y-4">
        {/* Compose */}
        <DsrtButton onClick={onComposeClick} variant="white" size="lg" fullWidth>
          <PencilSimple className="w-[15px] h-[15px]" weight="bold" />
          Compose
        </DsrtButton>

        {/* MAIL group */}
        <section>
          <p className="text-[9.5px] uppercase tracking-[0.14em] font-mono font-bold text-white/35 px-3 mb-1.5">
            Mail
          </p>
          <div
            className={cn(
              'rounded-xl p-1.5 space-y-0.5',
              'bg-gradient-to-b from-white/[0.02] to-transparent',
              'border border-white/[0.05]'
            )}
          >
            {MAIN_FOLDERS.map(renderItem)}
          </div>
        </section>

        {/* SMART VIEWS group */}
        <section>
          <p className="text-[9.5px] uppercase tracking-[0.14em] font-mono font-bold text-white/35 px-3 mb-1.5">
            Smart Views
          </p>
          <div
            className={cn(
              'rounded-xl p-1.5 space-y-0.5',
              'bg-gradient-to-b from-white/[0.02] to-transparent',
              'border border-white/[0.05]'
            )}
          >
            {SMART_VIEWS.map(renderItem)}
          </div>
        </section>

        <div className="px-3 pt-2 pb-4">
          <p className="text-[10px] text-white/25 leading-relaxed font-mono">
            DSRT Mail unifies communication for people, projects and ventures.
          </p>
        </div>
      </div>
    </aside>
  )
}