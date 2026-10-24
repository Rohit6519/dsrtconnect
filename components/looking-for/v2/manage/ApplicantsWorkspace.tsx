'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Eye,
  PencilSimple,
  Warning,
  Users,
  ChartLine,
  Pulse,
  Sparkle,
  Gear,
  FileText,
} from '@phosphor-icons/react'
import { ApplicantCard } from './ApplicantCard'
import { ApplicantDetailModal } from './ApplicantDetailModal'
import { ManageOverviewTab } from './tabs/ManageOverviewTab'
import { ManageAnalyticsTab } from './tabs/ManageAnalyticsTab'
import { ManageActivityTab } from './tabs/ManageActivityTab'
import { ManageMatchingTab } from './tabs/ManageMatchingTab'
import { ManageSettingsTab } from './tabs/ManageSettingsTab'

interface Props {
  opportunityId: string
}

type TabId = 'overview' | 'applicants' | 'matching' | 'activity' | 'analytics' | 'opportunity' | 'settings'

const TABS: { id: TabId; label: string; Icon: any }[] = [
  { id: 'overview', label: 'Overview', Icon: Pulse },
  { id: 'applicants', label: 'Applicants', Icon: Users },
  { id: 'matching', label: 'Matching', Icon: Sparkle },
  { id: 'activity', label: 'Activity', Icon: Pulse },
  { id: 'analytics', label: 'Analytics', Icon: ChartLine },
  { id: 'opportunity', label: 'Opportunity', Icon: FileText },
  { id: 'settings', label: 'Settings', Icon: Gear },
]

const STAGES = [
  { key: 'submitted', label: 'New', color: 'zinc' },
  { key: 'under-review', label: 'Reviewing', color: 'blue' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'cyan' },
  { key: 'interview', label: 'Interview', color: 'purple' },
  { key: 'accepted', label: 'Selected', color: 'emerald' },
  { key: 'declined', label: 'Rejected', color: 'red' },
]

const STATUS_BADGES: Record<string, string> = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  'closing-soon': 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  draft: 'border-zinc-700 bg-zinc-900 text-zinc-400',
  paused: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  filled: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  closed: 'border-zinc-700 bg-zinc-900 text-zinc-500',
}

export function ApplicantsWorkspace({ opportunityId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) || 'overview'

  const [tab, setTab] = useState<TabId>(initialTab)
  const [opportunity, setOpportunity] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [oppRes, appsRes] = await Promise.all([
        fetch(`/api/opportunities/${opportunityId}`),
        fetch(`/api/opportunities/${opportunityId}/applicants`),
      ])
      if (!oppRes.ok) throw new Error('Opportunity not found')
      const oppData = await oppRes.json()
      const appsData = appsRes.ok ? await appsRes.json() : { applications: [], stats: {} }

      setOpportunity(oppData)
      setApplications(appsData.applications || [])
      setStats(appsData.stats || {})
    } catch (e: any) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  // Poll lightly for near-realtime (SSE can replace later)
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 30000)
    return () => clearInterval(t)
  }, [load])

  const changeTab = (t: TabId) => {
    setTab(t)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', t)
    router.replace(`/looking-for/my-opportunities/${opportunityId}?${params.toString()}`, { scroll: false })
  }

  const updateApplication = async (appId: string, patch: any) => {
    const prev = applications
    setApplications(p => p.map(a => a.id === appId ? { ...a, ...patch } : a))
    try {
      const body = { ...patch }
      if (body.first_viewed_at === true) delete body.first_viewed_at
      const res = await fetch(`/api/opportunities/${opportunityId}/applicants/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Update failed')
      await load()
    } catch {
      setApplications(prev)
      await load()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-[13px] text-zinc-500">Loading opportunity cockpit...</div>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center max-w-md">
          <Warning size={20} className="mx-auto mb-3 text-red-400" />
          <h1 className="text-[16px] font-bold text-white mb-1">{error || 'Not found'}</h1>
          <Link
            href="/looking-for?tab=my-opportunities"
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-zinc-800 text-[13px] text-zinc-300 hover:text-white"
          >
            <ArrowLeft size={12} weight="bold" />
            Back to My Opportunities
          </Link>
        </div>
      </div>
    )
  }

  const selectedApp = applications.find(a => a.id === selectedAppId)
  const filteredApps = activeStage === 'all'
    ? applications
    : applications.filter(a => a.pipeline_stage === activeStage)

  const badgeCls = STATUS_BADGES[opportunity.status] || STATUS_BADGES.active

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <button
              onClick={() => router.push('/looking-for?tab=my-opportunities')}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={12} weight="bold" />
              My Opportunities
            </button>
            <div className="flex items-center gap-2">
              <Link
                href={`/looking-for/${opportunity.slug || opportunity.id}`}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-medium text-zinc-300 hover:text-white transition-colors"
              >
                <Eye size={12} />
                View public
              </Link>
              <Link
                href={`/looking-for/create?edit=${opportunity.id}`}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-medium text-zinc-300 hover:text-white transition-colors"
              >
                <PencilSimple size={12} />
                Edit
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-[22px] md:text-[24px] font-bold text-white leading-tight tracking-tight">
              {opportunity.title}
            </h1>
            <span className={'inline-flex h-6 px-2 items-center rounded-md text-[10px] font-bold uppercase tracking-wider border ' + badgeCls}>
              {opportunity.status}
            </span>
            {opportunity.opportunity_number && (
              <span className="text-[11px] font-mono text-zinc-500">{opportunity.opportunity_number}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-[12px] text-zinc-400 mb-4">
            <span className="font-semibold text-zinc-200">{stats.total || applications.length} Applicants</span>
            <span className="text-zinc-700">|</span>
            <span>{stats['under-review'] || 0} Reviewing</span>
            <span className="text-zinc-700">|</span>
            <span>{stats.shortlisted || 0} Shortlisted</span>
            <span className="text-zinc-700">|</span>
            <span>{stats.interview || 0} Interviewing</span>
            <span className="text-zinc-700">|</span>
            <span>{stats.accepted || 0} Selected</span>
            <span className="text-zinc-700">|</span>
            <span>{opportunity.view_count || 0} Views</span>
            <span className="text-zinc-700">|</span>
            <span>{opportunity.save_count || 0} Saves</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => changeTab(t.id)}
                  className={
                    'relative inline-flex items-center gap-1.5 py-3 px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ' +
                    (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200')
                  }
                >
                  <t.Icon size={13} weight={active ? 'fill' : 'regular'} />
                  {t.label}
                  {active && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-white/20 via-white to-white/20"
                      style={{ boxShadow: '0 0 12px rgba(255,255,255,0.35)' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6">
        {tab === 'overview' && (
          <ManageOverviewTab
            opportunity={opportunity}
            applications={applications}
            stats={stats}
            onOpenApplicants={() => changeTab('applicants')}
            onOpenAnalytics={() => changeTab('analytics')}
          />
        )}

        {tab === 'applicants' && (
          applications.length === 0 ? (
            <EmptyApplicants />
          ) : (
            <>
              <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-hide">
                <StageChip label="All" count={stats.total || applications.length} active={activeStage === 'all'} onClick={() => setActiveStage('all')} />
                {STAGES.map(s => (
                  <StageChip
                    key={s.key}
                    label={s.label}
                    count={stats[s.key] || 0}
                    active={activeStage === s.key}
                    onClick={() => setActiveStage(s.key)}
                  />
                ))}
              </div>

              {activeStage === 'all' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {STAGES.map(s => (
                    <KanbanColumn
                      key={s.key}
                      stage={s}
                      applications={applications.filter(a => {
                        const st = a.pipeline_stage || 'submitted'
                        if (s.key === 'submitted') return st === 'submitted' || st === 'viewed'
                        return st === s.key
                      })}
                      onSelect={setSelectedAppId}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredApps.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                      <p className="text-[13px] text-zinc-500">No applicants in this stage</p>
                    </div>
                  ) : (
                    filteredApps.map(app => (
                      <ApplicantCard key={app.id} application={app} onClick={() => setSelectedAppId(app.id)} />
                    ))
                  )}
                </div>
              )}
            </>
          )
        )}

        {tab === 'matching' && (
          <ManageMatchingTab opportunityId={opportunityId} opportunity={opportunity} />
        )}

        {tab === 'activity' && (
          <ManageActivityTab opportunityId={opportunityId} />
        )}

        {tab === 'analytics' && (
          <ManageAnalyticsTab opportunityId={opportunityId} />
        )}

        {tab === 'opportunity' && (
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] to-[#0f0f11] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-white">Public opportunity preview</h2>
              <Link href={`/looking-for/${opportunity.slug || opportunity.id}`} className="text-[12.5px] text-zinc-400 hover:text-white">
                Open full page →
              </Link>
            </div>
            <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {opportunity.content_text || opportunity.description || 'No description yet.'}
            </p>
            {opportunity.required_skills?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {opportunity.required_skills.map((s: string) => (
                  <span key={s} className="h-6 px-2.5 rounded-md text-[11px] font-medium border border-zinc-800 bg-zinc-950 text-zinc-300 inline-flex items-center">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <ManageSettingsTab opportunity={opportunity} onRefresh={load} />
        )}
      </div>

      {selectedApp && (
        <ApplicantDetailModal
          application={selectedApp}
          opportunityId={opportunityId}
          onClose={() => setSelectedAppId(null)}
          onUpdate={updateApplication}
        />
      )}
    </div>
  )
}

function KanbanColumn({
  stage, applications, onSelect,
}: {
  stage: { key: string; label: string; color: string }
  applications: any[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/30 to-zinc-950/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="px-3 py-2.5 border-b border-zinc-800/80 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{stage.label}</span>
        <span className="text-[10.5px] font-bold text-zinc-500 h-5 min-w-[20px] px-1.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          {applications.length}
        </span>
      </div>
      <div className="p-2 space-y-2 min-h-[120px] max-h-[70vh] overflow-y-auto scrollbar-hide">
        {applications.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-zinc-600 italic">Empty</div>
        ) : (
          applications.map(app => (
            <ApplicantCard key={app.id} application={app} compact onClick={() => onSelect(app.id)} />
          ))
        )}
      </div>
    </div>
  )
}

function StageChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-medium whitespace-nowrap transition-colors ' +
        (active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
      }
    >
      {label}
      {count > 0 && (
        <span className={'text-[10.5px] font-bold ' + (active ? 'text-zinc-400' : 'text-zinc-600')}>{count}</span>
      )}
    </button>
  )
}

function EmptyApplicants() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 p-16 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
      <h2 className="text-[16px] font-bold text-white mb-1.5">No applicants yet</h2>
      <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto leading-relaxed">
        When people apply, they appear in your pipeline with match intelligence, notes, and stage controls.
      </p>
    </div>
  )
}