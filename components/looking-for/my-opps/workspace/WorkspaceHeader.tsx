'use client'

const STATUS_BADGE: Record<string, string> = {
  active: 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300',
  'closing-soon': 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  draft: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  paused: 'border-amber-500/25 bg-amber-500/[0.08] text-amber-300',
  filled: 'border-blue-500/25 bg-blue-500/[0.08] text-blue-300',
  closed: 'border-zinc-700 bg-zinc-900 text-zinc-500',
  expired: 'border-zinc-700 bg-zinc-900 text-zinc-500',
  archived: 'border-zinc-700 bg-zinc-900 text-zinc-500',
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export function WorkspaceHeader({ opp }: { opp: any }) {
  return (
    <div className="pt-3 pb-4">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className={'inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ' + (STATUS_BADGE[opp.status] || STATUS_BADGE.active)}>
          {opp.status}
        </span>
        {opp.opportunity_number && (
          <span className="text-[10.5px] font-mono text-zinc-500">{opp.opportunity_number}</span>
        )}
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
          {String(opp.opportunity_type || '').replace(/-/g, ' ')}
        </span>
      </div>
      <h1 className="text-[22px] md:text-[26px] font-bold text-white tracking-tight leading-tight">
        {opp.title}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-zinc-500">
        <Metric label="Applicants" value={opp.application_count || 0} />
        <Metric label="Qualified" value={opp.qualified_count || 0} />
        <Metric label="Shortlisted" value={opp.shortlisted_count || 0} />
        <Metric label="Interviewing" value={opp.interviewing_count || 0} />
        <Metric label="Selected" value={opp.selected_count || 0} accent="emerald" />
        <Metric label="Views" value={opp.view_count || 0} />
        <Metric label="Saves" value={opp.save_count || 0} />
        <span className="text-zinc-600">Last activity {timeAgo(opp.last_activity_at)}</span>
      </div>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: 'emerald' }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={'text-[13px] font-bold ' + (accent === 'emerald' ? 'text-emerald-300' : 'text-white')}>
        {value.toLocaleString()}
      </span>
      <span className="text-[10.5px] uppercase tracking-wider">{label}</span>
    </span>
  )
}