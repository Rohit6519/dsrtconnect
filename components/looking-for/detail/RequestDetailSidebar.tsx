'use client'

import { useState } from 'react'
import {
  BookmarkSimple, Share, Flag, MapPin, Clock, Users,
  CalendarBlank, Briefcase, CheckCircle, Target,
} from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'
import { COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface Props {
  item: TeamUpItem
  onApply: () => void
  onSaveToggle: (saved: boolean) => Promise<void>
  onShare: () => void
  onReport: () => void
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
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

export function RequestDetailSidebar({ item, onApply, onSaveToggle, onShare, onReport }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!item.is_saved)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    const newSaved = !saved
    setSaved(newSaved)
    try {
      await onSaveToggle(newSaved)
    } catch {
      setSaved(!newSaved)
    } finally {
      setSaving(false)
    }
  }

  const isClosed =
    item.status === 'closed' ||
    item.status === 'filled' ||
    item.status === 'archived' ||
    (item.application_deadline && new Date(item.application_deadline) < new Date())

  const meta = [
    {
      Icon: Target,
      label: 'Type',
      value: item.request_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    },
    item.commitment && {
      Icon: Clock,
      label: 'Commitment',
      value: COMMITMENT_LABELS[item.commitment] || item.commitment,
    },
    item.work_mode && {
      Icon: MapPin,
      label: 'Work mode',
      value: WORK_MODE_LABELS[item.work_mode] || item.work_mode,
    },
    item.location && {
      Icon: MapPin,
      label: 'Location',
      value: item.location,
    },
    item.hours_per_week && {
      Icon: Clock,
      label: 'Hours',
      value: `${item.hours_per_week} hrs/week`,
    },
    item.positions_open > 0 && {
      Icon: Users,
      label: 'Openings',
      value: `${item.positions_open}`,
    },
    item.application_deadline && {
      Icon: CalendarBlank,
      label: 'Deadline',
      value: formatDate(item.application_deadline),
    },
    item.published_at && {
      Icon: Briefcase,
      label: 'Posted',
      value: timeAgo(item.published_at),
    },
  ].filter(Boolean) as Array<{ Icon: any; label: string; value: string }>

  return (
    <div className="space-y-3">
      {/* Primary card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
        <div className="px-5 py-5 border-b border-zinc-800/80">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4">
            About this opportunity
          </div>
          <div className="space-y-3">
            {meta.map((m, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-[12px] text-zinc-500">
                  <m.Icon size={12} weight="regular" />
                  {m.label}
                </div>
                <div className="text-[12.5px] text-zinc-200 text-right">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-b border-zinc-800/80">
          <div className="flex items-center justify-between text-[12px] mb-3">
            <span className="text-zinc-500">Applications</span>
            <span className="text-zinc-200 font-medium">{item.application_count || 0}</span>
          </div>
          {item.view_count > 0 && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-zinc-500">Views</span>
              <span className="text-zinc-200 font-medium">{item.view_count}</span>
            </div>
          )}
        </div>

        <div className="p-4">
          {item.has_applied ? (
            <div className="w-full h-10 rounded-md border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-[13px] font-medium flex items-center justify-center gap-1.5">
              <CheckCircle size={13} weight="fill" />
              Applied
            </div>
          ) : isClosed ? (
            <button
              disabled
              className="w-full h-10 rounded-md bg-zinc-900 text-zinc-500 text-[13px] font-medium cursor-not-allowed"
            >
              Applications closed
            </button>
          ) : (
            <button
              onClick={onApply}
              className="w-full h-10 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      </div>

      {/* Secondary actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={
            'h-9 rounded-md border flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors ' +
            (saved
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
              : 'border-zinc-800 hover:border-zinc-700 text-zinc-300')
          }
        >
          <BookmarkSimple size={12} weight={saved ? 'fill' : 'regular'} />
          {saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={onShare}
          className="h-9 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors"
        >
          <Share size={12} weight="regular" />
          Share
        </button>
        <button
          onClick={onReport}
          className="h-9 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors"
        >
          <Flag size={12} weight="regular" />
          Report
        </button>
      </div>
    </div>
  )
}
