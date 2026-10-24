'use client'

import { useEffect, useState } from 'react'
import { KpiCard } from '@/components/looking-for/my-opps/analytics/parts/KpiCard'
import { Section } from '@/components/looking-for/my-opps/analytics/parts/Section'
import { LineArea } from '@/components/looking-for/my-opps/analytics/parts/LineArea'
import type { WorkspaceTab } from '../WorkspaceTabs'

export function OverviewTab({
  opp, onChangeTab,
}: {
  opp: any
  onChangeTab: (t: WorkspaceTab) => void
  onRefresh: () => void
}) {
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [stats, setStats] = useState<any | null>(null)

  useEffect(() => {
    fetch(`/api/opportunities/dashboard/analytics?range=30d&opportunity_id=${opp.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
  }, [opp.id])

  useEffect(() => {
    // Live stage counts — always accurate, no stale trigger dependency
    fetch(`/api/opportunities/${opp.id}/stage-counts`)
      .then(r => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
  }, [opp.id])

  const applicants   = stats?.applicants   ?? 0
  const qualified    = stats?.qualified    ?? 0
  const shortlisted  = stats?.shortlisted  ?? 0
  const interviewing = stats?.interviewing ?? 0
  const selected     = stats?.selected     ?? 0
  const conversion   = stats?.conversion   ?? 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Applicants"   value={applicants} />
        <KpiCard label="Qualified"    value={qualified} />
        <KpiCard label="Shortlisted"  value={shortlisted} />
        <KpiCard label="Interviewing" value={interviewing} />
        <KpiCard label="Selected"     value={selected} />
        <KpiCard label="Conversion"   value={`${conversion}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <Section title="Activity (last 30 days)" subtitle="Views vs. applications submitted">
          {analytics ? (
            <LineArea
              data={analytics.series || []}
              series={[
                { key: 'views', label: 'Views', color: 'rgba(255,255,255,0.9)' },
                { key: 'applications_submitted', label: 'Applications', color: 'rgba(59,130,246,0.9)' },
              ]}
            />
          ) : (
            <div className="h-40 rounded-xl bg-zinc-900/40 animate-pulse" />
          )}
        </Section>

        <Section title="Quick actions" subtitle="Jump to the right place">
          <div className="grid grid-cols-2 gap-2">
            <QuickBtn onClick={() => onChangeTab('applicants')}    label="Review applicants"    hint={`${applicants} total`} />
            <QuickBtn onClick={() => onChangeTab('pipeline')}      label="Open pipeline"        hint="Kanban board" />
            <QuickBtn onClick={() => onChangeTab('messages')}      label="Reply to messages"    hint="Contextual thread" />
            <QuickBtn onClick={() => onChangeTab('performance')}   label="View performance"     hint="Full analytics" />
            <QuickBtn onClick={() => onChangeTab('distribution')}  label="Manage distribution"  hint="Where it appears" />
            <QuickBtn onClick={() => onChangeTab('settings')}      label="Settings"             hint="Status, access" />
          </div>
        </Section>
      </div>
    </div>
  )
}

function QuickBtn({ onClick, label, hint }: { onClick: () => void; label: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-950/40 px-3 py-3 transition-colors"
    >
      <div className="text-[12.5px] font-semibold text-white">{label}</div>
      <div className="text-[10.5px] text-zinc-500 mt-0.5">{hint}</div>
    </button>
  )
}