'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChartLine, Warning, PaperPlaneTilt, Envelope, CheckCircle,
  XCircle, Handshake, PauseCircle, Clock, Sparkle, ArrowUpRight,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'

interface ActivityEvent {
  id: string
  type: string
  timestamp: string
  title: string
  subtitle?: string
  stage?: string
  actor?: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
  }
  inviteStatus?: string
  link?: string | null
}

const TYPE_META: Record<string, { Icon: any; color: string; bg: string }> = {
  applied:                   { Icon: PaperPlaneTilt, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  application_updated:       { Icon: Sparkle,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  received_application:      { Icon: Envelope,       color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  received_invitation:       { Icon: PaperPlaneTilt, color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  sent_invitation:           { Icon: PaperPlaneTilt, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  invitation_responded:      { Icon: Handshake,      color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  sent_invitation_responded: { Icon: Handshake,      color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  published:                 { Icon: Sparkle,        color: 'text-blue-400',    bg: 'bg-blue-500/10' },
}

const STAGE_ICON: Record<string, any> = {
  applied: Clock,
  under_review: PauseCircle,
  shortlisted: CheckCircle,
  interview: Sparkle,
  accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: XCircle,
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function groupByDate(events: ActivityEvent[]): Array<{ label: string; events: ActivityEvent[] }> {
  const groups: Record<string, ActivityEvent[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  events.forEach(e => {
    const d = new Date(e.timestamp)
    let label: string
    if (d >= today) label = 'Today'
    else if (d >= yesterday) label = 'Yesterday'
    else if (d >= week) label = 'This week'
    else label = 'Earlier'
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })

  const order = ['Today', 'Yesterday', 'This week', 'Earlier']
  return order.filter(l => groups[l]).map(l => ({ label: l, events: groups[l] }))
}

export function ActivityTab() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/looking-for/activity?limit=100')
      if (!res.ok) throw new Error('Failed to load activity')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 rounded-lg border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Warning size={20} weight="regular" />}
        title="Couldn't load activity"
        description={error}
      />
    )
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<ChartLine size={20} weight="regular" />}
        title="No activity yet"
        description="Your team-up activity — applications, invitations, and status updates — will appear here."
      />
    )
  }

  const groups = groupByDate(events)

  return (
    <div className="space-y-6">
      {groups.map(group => (
        <div key={group.label}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2.5 px-1">
            {group.label}
          </div>
          <div className="space-y-1.5">
            {group.events.map(event => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const meta = TYPE_META[event.type] || TYPE_META.applied
  const StageIcon = event.stage ? STAGE_ICON[event.stage] : null

  const content = (
    <div className="group flex items-center gap-3 px-3.5 py-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all">
      {/* Icon or avatar */}
      {event.actor?.avatar_url ? (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
          <Image src={event.actor.avatar_url} alt="" fill className="object-cover" sizes="32px" />
        </div>
      ) : event.actor ? (
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[12px] font-medium text-zinc-400 shrink-0">
          {event.actor.full_name?.[0]?.toUpperCase() || '?'}
        </div>
      ) : (
        <div className={
          'w-8 h-8 rounded-md flex items-center justify-center shrink-0 ' + meta.bg + ' ' + meta.color
        }>
          <meta.Icon size={13} weight="regular" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] text-zinc-200 truncate max-w-[520px]">
            {event.title}
          </span>
          {event.stage && StageIcon && (
            <span className={
              'inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider border ' +
              (event.stage === 'accepted'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : event.stage === 'rejected'
                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                : event.stage === 'shortlisted' || event.stage === 'interview'
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400')
            }>
              <StageIcon size={9} weight="fill" />
              {event.stage.replace('_', ' ')}
            </span>
          )}
          {event.inviteStatus && event.inviteStatus !== 'pending' && (
            <span className={
              'inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider border ' +
              (event.inviteStatus === 'accepted'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-900 text-zinc-500')
            }>
              {event.inviteStatus}
            </span>
          )}
        </div>
        {event.subtitle && (
          <div className="text-[11.5px] text-zinc-500 truncate mt-0.5">
            {event.subtitle}
          </div>
        )}
      </div>

      {/* Time */}
      <div className="text-[11px] text-zinc-500 shrink-0">
        {timeAgo(event.timestamp)}
      </div>

      {event.link && (
        <ArrowUpRight size={11} weight="bold" className="text-zinc-600 group-hover:text-zinc-300 shrink-0" />
      )}
    </div>
  )

  if (event.link) {
    return <Link href={event.link}>{content}</Link>
  }
  return content
}
