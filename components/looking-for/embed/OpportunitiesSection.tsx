'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Briefcase, ArrowRight, MapPin, Clock, Users, CalendarBlank,
  Sparkle,
} from '@phosphor-icons/react'
import { REQUEST_TYPE_LABELS, COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface Opportunity {
  id: string
  source_type: string
  source_id: string
  title: string
  tagline?: string | null
  request_type: string
  required_skills?: string[]
  work_mode?: string | null
  commitment?: string | null
  location?: string | null
  application_deadline?: string | null
  is_featured?: boolean
  is_verified?: boolean
  application_count?: number
  positions_open?: number
  published_at?: string | null
  owner?: {
    id: string
    username: string
    full_name: string
    avatar_url: string | null
  } | null
  venture?: { id: string; slug: string; name: string; logo_url: string | null } | null
  project?: { id: string; slug: string; name: string; logo_url: string | null; icon?: string | null } | null
}

interface Props {
  scope: 'venture' | 'project' | 'profile'
  slug: string
  title?: string
  emptyMessage?: string
  showViewAll?: boolean
  limit?: number
}

export function OpportunitiesSection({
  scope, slug, title, emptyMessage, showViewAll = true, limit = 6,
}: Props) {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const url =
          scope === 'venture' ? `/api/ventures/${slug}/opportunities` :
          scope === 'project' ? `/api/projects/${slug}/opportunities` :
          `/api/profile/${slug}/opportunities`
        const res = await fetch(url)
        const data = await res.json()
        if (cancelled) return
        setOpps((data.opportunities || []).slice(0, limit))
        setTotal(data.total || 0)
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [scope, slug, limit])

  const heading = title || 'Open opportunities'
  const emptyText = emptyMessage || 'No open opportunities right now.'

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{heading}</h3>
        </div>
        <div className="space-y-2">
          {[0, 1].map(i => (
            <div key={i} className="h-24 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (opps.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{heading}</h3>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
          <Briefcase size={16} className="text-zinc-600 mx-auto mb-2" />
          <div className="text-[12.5px] text-zinc-500">{emptyText}</div>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {heading} · {total}
        </h3>
        {showViewAll && total > limit && (
          <Link
            href={`/looking-for?tab=explore`}
            className="inline-flex items-center gap-1 text-[11.5px] text-zinc-400 hover:text-zinc-200"
          >
            View all
            <ArrowRight size={10} weight="bold" />
          </Link>
        )}
      </div>
      <div className="space-y-2">
        {opps.map(o => (
          <OpportunityInlineCard key={`${o.source_type}-${o.source_id}`} opportunity={o} />
        ))}
      </div>
    </section>
  )
}

function OpportunityInlineCard({ opportunity }: { opportunity: Opportunity }) {
  const typeLabel = REQUEST_TYPE_LABELS[opportunity.request_type] || opportunity.request_type
  const commit = opportunity.commitment ? COMMITMENT_LABELS[opportunity.commitment] || opportunity.commitment : null
  const mode = opportunity.work_mode ? WORK_MODE_LABELS[opportunity.work_mode] || opportunity.work_mode : null

  return (
    <Link
      href={`/looking-for/${opportunity.source_id}?source=${opportunity.source_type}`}
      className="group block rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/40 transition-all p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {typeLabel}
          </span>
          {opportunity.is_featured && (
            <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkle size={9} weight="fill" />
              Featured
            </span>
          )}
        </div>
      </div>

      <h4 className="text-[14.5px] font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
        {opportunity.title}
      </h4>

      {opportunity.tagline && (
        <p className="text-[12.5px] text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
          {opportunity.tagline}
        </p>
      )}

      {opportunity.required_skills && opportunity.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {opportunity.required_skills.slice(0, 4).map(s => (
            <span key={s} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
              {s}
            </span>
          ))}
          {opportunity.required_skills.length > 4 && (
            <span className="text-[10.5px] text-zinc-600">+{opportunity.required_skills.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
        {mode && (
          <div className="inline-flex items-center gap-1">
            <MapPin size={10} />
            {mode}
          </div>
        )}
        {commit && (
          <div className="inline-flex items-center gap-1">
            <Clock size={10} />
            {commit}
          </div>
        )}
        {opportunity.positions_open && opportunity.positions_open > 0 && (
          <div className="inline-flex items-center gap-1">
            <Users size={10} />
            {opportunity.positions_open}
          </div>
        )}
        {opportunity.application_deadline && (
          <div className="inline-flex items-center gap-1">
            <CalendarBlank size={10} />
            Closes {new Date(opportunity.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </Link>
  )
}
