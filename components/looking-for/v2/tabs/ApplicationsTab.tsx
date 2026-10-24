'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Files, Clock, CheckCircle, XCircle, ChatCircle, Handshake,
  ArrowUpRight, PauseCircle,
} from '@phosphor-icons/react'

const STAGES = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under-review', label: 'Under Review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'withdrawn', label: 'Withdrawn' },
]

const STAGE_META: Record<string, { label: string; Icon: any; className: string }> = {
  'submitted': { label: 'Submitted', Icon: Clock, className: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
  'viewed': { label: 'Viewed', Icon: Clock, className: 'border-zinc-700 bg-zinc-900 text-zinc-300' },
  'under-review': { label: 'Under Review', Icon: PauseCircle, className: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  'shortlisted': { label: 'Shortlisted', Icon: CheckCircle, className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
  'interview': { label: 'Interview', Icon: ChatCircle, className: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
  'offer': { label: 'Offer', Icon: Handshake, className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  'accepted': { label: 'Accepted', Icon: CheckCircle, className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  'declined': { label: 'Declined', Icon: XCircle, className: 'border-red-500/30 bg-red-500/10 text-red-400' },
  'withdrawn': { label: 'Withdrawn', Icon: XCircle, className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
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
  const [stage, setStage] = useState('all')
  const [apps, setApps] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (stage !== 'all') params.set('stage', stage)
      const res = await fetch('/api/opportunities/my-applications?' + params.toString())
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setApps(data.applications || [])
      setStats(data.stats || {})
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [stage])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-[13px] text-red-400">{error}</p>
      </div>
    )
  }

  const totalApps = stats.total || 0

  if (totalApps === 0 && stage === 'all') {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <Files size={20} className="text-zinc-500" />
        </div>
        <h2 className="text-[16px] font-bold text-white mb-1.5">No applications yet</h2>
        <p className="text-[12.5px] text-zinc-500 mb-4 max-w-md mx-auto leading-relaxed">
          When you apply to opportunities, you'll see them here to track their status.
        </p>
        <Link
          href="/looking-for"
          className="inline-flex items-center h-9 px-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300 hover:text-white transition-colors"
        >
          Browse opportunities
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total || 0} />
        <StatCard
          label="In review"
          value={(stats.submitted || 0) + (stats['under-review'] || 0) + (stats.viewed || 0)}
        />
        <StatCard label="Shortlisted" value={(stats.shortlisted || 0) + (stats.interview || 0)} accent="cyan" />
        <StatCard label="Accepted" value={stats.accepted || 0} accent="emerald" />
      </div>

      {/* Stage filter */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {STAGES.map(s => {
          const count = s.key === 'all' ? (stats.total || 0) : (stats[s.key] || 0)
          const isActive = stage === s.key
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ' +
                (isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
              }
            >
              {s.label}
              {count > 0 && (
                <span className={
                  'text-[10.5px] font-bold ' +
                  (isActive ? 'text-zinc-400' : 'text-zinc-600')
                }>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-[13px] text-zinc-500">No applications in {stage}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {apps.map(app => (
            <ApplicationRow key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  )
}

function ApplicationRow({ app }: { app: any }) {
  const meta = STAGE_META[app.pipeline_stage] || STAGE_META.submitted
  const opp = app.opportunity
  const posterName = opp?.poster?.full_name || opp?.poster?.username || 'Unknown'
  const contextName = opp?.project?.name || opp?.venture?.name || null

  const href = opp?.slug ? `/looking-for/${opp.slug}` : '/looking-for'

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70 transition-all p-4 shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center">
          {opp?.venture?.logo_url ? (
            <img src={opp.venture.logo_url} alt="" className="w-full h-full object-cover" />
          ) : opp?.project?.icon ? (
            <span className="text-lg">{opp.project.icon}</span>
          ) : opp?.cover_image_url ? (
            <img src={opp.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[14px] font-bold text-zinc-500">
              {(opp?.title || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h4 className="text-[14px] font-bold text-white group-hover:text-blue-400 truncate transition-colors">
              {opp?.title || 'Opportunity'}
            </h4>
            <span className={
              'inline-flex items-center gap-1.5 h-6 px-2 rounded text-[10.5px] font-medium uppercase tracking-wider border shrink-0 ' +
              meta.className
            }>
              <meta.Icon size={10} weight="fill" />
              {meta.label}
            </span>
          </div>

          <div className="text-[12px] text-zinc-500 mb-2">
            {contextName && <span className="text-zinc-400">{contextName}</span>}
            {contextName && <span className="mx-1.5 text-zinc-600">·</span>}
            <span>{posterName}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span>Applied {timeAgo(app.created_at)}</span>
            {app.stage_updated_at !== app.created_at && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>Updated {timeAgo(app.stage_updated_at)}</span>
              </>
            )}
          </div>
        </div>

        <ArrowUpRight size={13} weight="bold" className="text-zinc-600 group-hover:text-blue-400 shrink-0 mt-1" />
      </div>
    </Link>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'cyan' | 'emerald' }) {
  const color = accent === 'emerald' ? 'text-emerald-400' : accent === 'cyan' ? 'text-cyan-400' : 'text-white'
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </div>
      <div className={'text-[22px] font-bold tracking-tight ' + color}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}