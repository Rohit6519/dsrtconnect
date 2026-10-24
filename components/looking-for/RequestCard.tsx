'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import {
  MapPin, Clock, Users, CalendarBlank, BookmarkSimple,
  Sparkle, CheckCircle, ArrowUpRight,
} from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'
import { REQUEST_TYPE_LABELS, COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface Props {
  item: TeamUpItem
  onSaveToggle?: (item: TeamUpItem, saved: boolean) => void
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Expired'
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  if (days < 7) return `${days} days left`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

export function RequestCard({ item, onSaveToggle }: Props) {
  const [saved, setSaved] = useState(!!item.is_saved)
  const [saving, setSaving] = useState(false)

  const typeLabel = REQUEST_TYPE_LABELS[item.request_type] || item.request_type
  const commitmentLabel = item.commitment ? COMMITMENT_LABELS[item.commitment] || item.commitment : null
  const workModeLabel = item.work_mode ? WORK_MODE_LABELS[item.work_mode] || item.work_mode : null

  const contextEntity = item.venture || item.project
  const detailUrl = `/looking-for/${item.source_id}?source=${item.source_type}`

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return
    setSaving(true)
    const newSaved = !saved
    setSaved(newSaved)
    try {
      const res = await fetch(
        `/api/looking-for/${item.source_id}/save${newSaved ? '' : `?source=${item.source_type}`}`,
        {
          method: newSaved ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: newSaved ? JSON.stringify({ source_type: item.source_type }) : undefined,
        }
      )
      if (!res.ok && res.status !== 409) setSaved(!newSaved)
      onSaveToggle?.(item, newSaved)
    } catch {
      setSaved(!newSaved)
    } finally {
      setSaving(false)
    }
  }

  const deadline = formatDeadline(item.application_deadline)
  const isUrgent = item.urgency === 'urgent' || item.urgency === 'high' || item.status === 'closing_soon'

  return (
    <Link
      href={detailUrl}
      className="group relative block rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all p-5"
    >
      {/* Top row: type badge + context + save */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {typeLabel}
          </span>
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkle size={9} weight="fill" />
              Featured
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {item.status === 'closing_soon' ? 'Closing soon' : 'Urgent'}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          className={
            'shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors ' +
            (saved
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60')
          }
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <BookmarkSimple size={14} weight={saved ? 'fill' : 'regular'} />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-semibold text-white leading-snug mb-1.5 group-hover:text-blue-400 transition-colors">
        {item.title}
      </h3>

      {/* Context (venture/project name) */}
      {contextEntity && (
        <div className="flex items-center gap-2 mb-2.5">
          {contextEntity.logo_url ? (
            <div className="w-4 h-4 rounded-sm overflow-hidden bg-zinc-800 shrink-0 relative">
              <Image src={contextEntity.logo_url} alt="" fill className="object-cover" sizes="16px" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-sm bg-zinc-800 shrink-0" />
          )}
          <span className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
            {contextEntity.name}
          </span>
          {item.is_verified && (
            <CheckCircle size={11} weight="fill" className="text-blue-400" />
          )}
        </div>
      )}

      {/* Description */}
      {item.description && (
        <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-2 mb-4">
          {item.description}
        </p>
      )}

      {/* Skills */}
      {item.required_skills && item.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.required_skills.slice(0, 5).map(skill => (
            <span
              key={skill}
              className="inline-flex items-center h-6 px-2 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
            >
              {skill}
            </span>
          ))}
          {item.required_skills.length > 5 && (
            <span className="inline-flex items-center h-6 px-2 rounded text-[11px] font-medium text-zinc-500">
              +{item.required_skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[11.5px] text-zinc-500 mb-4">
        {workModeLabel && (
          <div className="inline-flex items-center gap-1">
            <MapPin size={11} weight="regular" />
            <span>{workModeLabel}</span>
          </div>
        )}
        {commitmentLabel && (
          <div className="inline-flex items-center gap-1">
            <Clock size={11} weight="regular" />
            <span>{commitmentLabel}</span>
          </div>
        )}
        {item.hours_per_week && (
          <div className="inline-flex items-center gap-1">
            <span>{item.hours_per_week} hrs/week</span>
          </div>
        )}
        {deadline && (
          <div className={
            'inline-flex items-center gap-1 ' +
            (deadline.includes('day') || deadline.includes('today') ? 'text-orange-400' : '')
          }>
            <CalendarBlank size={11} weight="regular" />
            <span>{deadline}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
        <div className="flex items-center gap-3 text-[11.5px] text-zinc-500">
          <div className="inline-flex items-center gap-1">
            <Users size={11} weight="regular" />
            <span>{item.application_count || 0} applicant{item.application_count !== 1 ? 's' : ''}</span>
          </div>
          {item.positions_open > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
              <span>{item.positions_open} opening{item.positions_open !== 1 ? 's' : ''}</span>
            </>
          )}
          {item.published_at && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
              <span>{timeAgo(item.published_at)}</span>
            </>
          )}
        </div>
        <div className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-400 group-hover:text-blue-400 transition-colors">
          View
          <ArrowUpRight size={11} weight="bold" />
        </div>
      </div>
    </Link>
  )
}
