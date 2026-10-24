'use client'

import { useEffect, useState } from 'react'
import { Pulse, Users, Eye, Sparkle, WarningCircle, CheckCircle } from '@phosphor-icons/react'

export function ManageOverviewTab({
  opportunity, applications, stats, onOpenApplicants, onOpenAnalytics,
}: {
  opportunity: any
  applications: any[]
  stats: Record<string, number>
  onOpenApplicants: () => void
  onOpenAnalytics: () => void
}) {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/opportunities/${opportunity.id}/analytics?range=30d`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setHealth(d?.health || null))
      .catch(() => {})
  }, [opportunity.id])

  const recent = [...applications]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Applicants" value={stats.total || applications.length} Icon={Users} onClick={onOpenApplicants} />
        <Kpi label="Views" value={opportunity.view_count || 0} Icon={Eye} onClick={onOpenAnalytics} />
        <Kpi label="Conversion" value={`${opportunity.conversion_rate || 0}%`} Icon={Pulse} accent="emerald" />
        <Kpi label="Health" value={health?.overall_score != null ? `${health.overall_score}/100` : '—'} Icon={Sparkle} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-4">Opportunity health</h3>
          {health ? (
            <>
              <div className="flex items-end gap-3 mb-5">
                <div className="text-[40px] font-bold text-white leading-none">{health.overall_score}</div>
                <div className="text-[13px] text-zinc-500 mb-1">/ 100</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5">
                <ScoreBar label="Visibility" value={health.visibility_score} />
                <ScoreBar label="Engagement" value={health.engagement_score} />
                <ScoreBar label="Conversion" value={health.conversion_score} />
                <ScoreBar label="Quality" value={health.quality_score} />
                <ScoreBar label="Clarity" value={health.clarity_score} />
                <ScoreBar label="Freshness" value={health.freshness_score} />
              </div>
              <div className="space-y-2">
                {(health.insights || []).map((ins: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
                    {ins.type === 'good' ? (
                      <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" weight="fill" />
                    ) : (
                      <WarningCircle size={14} className={ins.type === 'bad' ? 'text-red-400 mt-0.5 shrink-0' : 'text-amber-400 mt-0.5 shrink-0'} weight="fill" />
                    )}
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 animate-pulse rounded-xl bg-zinc-900/50" />
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Latest applicants</h3>
            <button onClick={onOpenApplicants} className="text-[12px] text-zinc-400 hover:text-white">View all</button>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-[12.5px] text-zinc-500 py-8 text-center">No applicants yet</p>
            ) : recent.map(app => {
              const a = app.applicant || app.applicant_snapshot
              return (
                <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-800/70 bg-zinc-950/40">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[11px] font-bold text-zinc-500">
                    {a?.avatar_url ? <img src={a.avatar_url} className="w-full h-full object-cover" alt="" /> : (a?.full_name || '?').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-white truncate">{a?.full_name || a?.username || 'Applicant'}</div>
                    <div className="text-[11px] text-zinc-500 capitalize">{(app.pipeline_stage || 'submitted').replace(/-/g, ' ')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, Icon, accent, onClick }: any) {
  const color = accent === 'emerald' ? 'text-emerald-400' : accent === 'blue' ? 'text-blue-400' : 'text-white'
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-zinc-800/80 p-4 bg-gradient-to-b from-[#18181b] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
        <Icon size={12} className="text-zinc-600" />
      </div>
      <div className={'text-[22px] font-bold ' + color}>{value}</div>
    </button>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-300 font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-zinc-600 to-white/80" style={{ width: `${Math.min(100, value || 0)}%` }} />
      </div>
    </div>
  )
}