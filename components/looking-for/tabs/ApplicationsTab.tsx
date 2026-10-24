'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Files, Clock, CheckCircle, XCircle, ChatCircle,
  Handshake, ArrowUpRight, PauseCircle,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { FilterChips } from '../FilterChips'
import type { TeamUpApplication, PipelineStage } from '@/types/teamup'

const STAGE_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
]

const STAGE_META: Record<PipelineStage, { label: string; Icon: any; color: string }> = {
  applied: { label: 'Applied', Icon: Clock, color: 'text-zinc-400' },
  under_review: { label: 'Under Review', Icon: PauseCircle, color: 'text-blue-400' },
  shortlisted: { label: 'Shortlisted', Icon: CheckCircle, color: 'text-cyan-400' },
  interview: { label: 'Interview', Icon: ChatCircle, color: 'text-purple-400' },
  offer: { label: 'Offer', Icon: Handshake, color: 'text-amber-400' },
  accepted: { label: 'Accepted', Icon: CheckCircle, color: 'text-emerald-400' },
  rejected: { label: 'Rejected', Icon: XCircle, color: 'text-red-400' },
  withdrawn: { label: 'Withdrawn', Icon: XCircle, color: 'text-zinc-500' },
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

export function ApplicationsTab() {
  const [apps, setApps] = useState<TeamUpApplication[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (stage !== 'all') params.set('stage', stage)
      const res = await fetch(`/api/looking-for/my-applications?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load applications')
      const data = await res.json()
      setApps(data.applications || [])
      setStats(data.stats || {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [stage])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Files size={20} weight="regular" />}
        title="Couldn't load your applications"
        description={error}
      />
    )
  }

  if (apps.length === 0 && stage === 'all') {
    return (
      <EmptyState
        icon={<Files size={20} weight="regular" />}
        title="No applications yet"
        description="Opportunities you apply to will appear here so you can track their status."
        action={
          <Link
            href="/looking-for"
            className="inline-flex items-center h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300"
          >
            Browse opportunities
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total || 0} />
        <StatCard label="Under review" value={(stats.applied || 0) + (stats.under_review || 0)} />
        <StatCard label="Shortlisted" value={stats.shortlisted || 0} />
        <StatCard label="Accepted" value={stats.accepted || 0} accent />
      </div>

      {/* Stage chips */}
      <FilterChips chips={STAGE_CHIPS} active={stage} onChange={setStage} />

      {/* List */}
      {apps.length === 0 ? (
        <EmptyState
          icon={<Files size={20} weight="regular" />}
          title="No applications in this stage"
        />
      ) : (
        <div className="space-y-2.5">
          {apps.map(app => {
            const meta = STAGE_META[app.pipeline_stage] || STAGE_META.applied
            const opp = app.opportunity
            const ctx = app.context
            const url = opp?.id
              ? `/looking-for/${opp.id}?source=${app.source_type}`
              : '/looking-for'

            return (
              <Link
                key={app.id}
                href={url}
                className="group block rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Context logo */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative">
                    {ctx?.logo_url ? (
                      <Image src={ctx.logo_url} alt="" fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[14px] text-zinc-500">
                        {(ctx?.name || opp?.title || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {opp?.title || 'Opportunity'}
                        </h4>
                        {ctx?.name && (
                          <p className="text-[12px] text-zinc-500 mt-0.5">{ctx.name}</p>
                        )}
                      </div>
                      <div className={
                        'inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium border shrink-0 ' +
                        (app.pipeline_stage === 'accepted'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : app.pipeline_stage === 'rejected'
                          ? 'border-red-500/30 bg-red-500/10 text-red-400'
                          : app.pipeline_stage === 'shortlisted' || app.pipeline_stage === 'interview'
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400')
                      }>
                        <meta.Icon size={10} weight="fill" />
                        {meta.label}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11.5px] text-zinc-500 mt-2">
                      <span>Applied {timeAgo(app.created_at)}</span>
                      {app.stage_updated_at !== app.created_at && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                          <span>Updated {timeAgo(app.stage_updated_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-zinc-500 group-hover:text-blue-400 transition-colors mt-1">
                    <ArrowUpRight size={13} weight="bold" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">
        {label}
      </div>
      <div className={
        'text-[22px] font-semibold tracking-tight ' +
        (accent ? 'text-emerald-400' : 'text-white')
      }>
        {value}
      </div>
    </div>
  )
}
