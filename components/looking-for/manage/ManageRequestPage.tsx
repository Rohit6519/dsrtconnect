'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowUpRight, Warning, Users, Eye, ChartLine,
  Files, CheckCircle, Sparkle,
} from '@phosphor-icons/react'
import { ApplicantsList } from './ApplicantsList'
import { ApplicantCompareModal } from './ApplicantCompareModal'
import { SuggestedPeopleForRequest } from './SuggestedPeopleForRequest'
import { REQUEST_TYPE_LABELS } from '@/types/teamup'
import type { TeamUpItem, TeamUpApplication } from '@/types/teamup'

interface Props {
  id: string
  source: string
}

export function ManageRequestPage({ id, source }: Props) {
  const router = useRouter()
  const [item, setItem] = useState<TeamUpItem | null>(null)
  const [applications, setApplications] = useState<TeamUpApplication[]>([])
  const [stats, setStats] = useState({ views: 0, applications: 0, shortlisted: 0, accepted: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)
  const [activeTab, setActiveTab] = useState<'applicants' | 'suggested'>('applicants')

  const loadItem = useCallback(async () => {
    try {
      const res = await fetch(`/api/looking-for/${id}?source=${source}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setItem(data)
    } catch (e: any) {
      setError(e.message)
    }
  }, [id, source])

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch(`/api/looking-for/${id}/applications?source=${source}`)
      if (!res.ok) {
        if (res.status === 403) throw new Error('You are not authorized to manage this request')
        throw new Error('Failed to load applications')
      }
      const data = await res.json()
      const apps = data.applications || []
      setApplications(apps)
      setStats({
        views: item?.view_count || 0,
        applications: apps.length,
        shortlisted: apps.filter((a: TeamUpApplication) => a.pipeline_stage === 'shortlisted').length,
        accepted: apps.filter((a: TeamUpApplication) => a.pipeline_stage === 'accepted').length,
      })
    } catch (e: any) {
      setError(e.message)
    }
  }, [id, source, item?.view_count])

  useEffect(() => {
    setLoading(true)
    loadItem().finally(() => setLoading(false))
  }, [loadItem])

  useEffect(() => {
    if (item) loadApplications()
  }, [item, loadApplications])

  const toggleSelect = (appId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(appId)) next.delete(appId)
      else next.add(appId)
      return next
    })
  }

  const updateApplication = async (appId: string, patch: Partial<TeamUpApplication>) => {
    setApplications(apps =>
      apps.map(a => a.id === appId ? { ...a, ...patch } as TeamUpApplication : a)
    )
    try {
      const res = await fetch(`/api/looking-for/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      await loadApplications()
    } catch {
      await loadApplications()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <div className="h-4 w-20 bg-zinc-900 rounded animate-pulse mb-6" />
          <div className="h-8 w-1/2 bg-zinc-900 rounded animate-pulse mb-4" />
          <div className="h-64 bg-zinc-900/40 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-500">
            <Warning size={20} />
          </div>
          <h1 className="text-[18px] font-semibold text-white mb-1.5">
            {error === 'Not found' ? 'Request not found' : error}
          </h1>
          <Link
            href="/looking-for?tab=my-hirings"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 mt-4 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300"
          >
            <ArrowLeft size={13} weight="bold" />
            Back to My Hirings
          </Link>
        </div>
      </div>
    )
  }

  const typeLabel = REQUEST_TYPE_LABELS[item.request_type] || item.request_type
  const selectedApps = applications.filter(a => selectedIds.has(a.id))

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <button
          onClick={() => router.push('/looking-for?tab=my-hirings')}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
        >
          <ArrowLeft size={13} />
          My Hirings
        </button>

        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {typeLabel}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.12em] text-zinc-500">
                Managing
              </span>
            </div>
            <h1 className="text-[24px] font-semibold text-white leading-tight tracking-tight">
              {item.title}
            </h1>
          </div>
          <Link
            href={`/looking-for/${id}?source=${source}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-700 text-[13px] text-zinc-300 shrink-0"
          >
            View public
            <ArrowUpRight size={12} weight="bold" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SmallStatCard label="Views" value={item.view_count || 0} Icon={Eye} />
          <SmallStatCard label="Applications" value={stats.applications} Icon={Users} accent />
          <SmallStatCard label="Shortlisted" value={stats.shortlisted} Icon={CheckCircle} />
          <SmallStatCard label="Accepted" value={stats.accepted} Icon={ChartLine} />
        </div>

        {/* Tabs: Applicants | Suggested */}
        <div className="border-b border-zinc-800/80 mb-5">
          <div className="flex items-center gap-1">
            <TabButton
              active={activeTab === 'applicants'}
              onClick={() => setActiveTab('applicants')}
              Icon={Users}
              label="Applicants"
              count={applications.length}
            />
            <TabButton
              active={activeTab === 'suggested'}
              onClick={() => setActiveTab('suggested')}
              Icon={Sparkle}
              label="Suggested people"
            />
          </div>
        </div>

        {activeTab === 'applicants' ? (
          <>
            {selectedIds.size >= 2 && (
              <div className="sticky top-4 z-10 mb-4 flex items-center justify-between px-4 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
                <span className="text-[12.5px] font-medium text-blue-300">
                  {selectedIds.size} applicants selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="h-7 px-2.5 rounded text-[12px] text-zinc-300 hover:text-white"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowCompare(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[12.5px] font-medium"
                  >
                    <Files size={12} weight="regular" />
                    Compare
                  </button>
                </div>
              </div>
            )}
            <ApplicantsList
              applications={applications}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onUpdate={updateApplication}
            />
          </>
        ) : (
          <SuggestedPeopleForRequest
            requestId={id}
            source={source}
            requestTitle={item.title}
            requiredSkills={item.required_skills}
          />
        )}
      </div>

      {showCompare && selectedApps.length >= 2 && (
        <ApplicantCompareModal
          applications={selectedApps}
          onClose={() => setShowCompare(false)}
          onUpdate={updateApplication}
        />
      )}
    </div>
  )
}

function TabButton({
  active, onClick, Icon, label, count,
}: {
  active: boolean
  onClick: () => void
  Icon: any
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={
        'relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors ' +
        (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')
      }
    >
      <Icon size={13} weight={active ? 'fill' : 'regular'} />
      {label}
      {count !== undefined && (
        <span className="text-[11px] text-zinc-500 font-normal">· {count}</span>
      )}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full" />
      )}
    </button>
  )
}

function SmallStatCard({
  label, value, Icon, accent,
}: {
  label: string
  value: number
  Icon: any
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </div>
        <Icon size={12} weight="regular" className="text-zinc-600" />
      </div>
      <div className={
        'text-[22px] font-semibold tracking-tight ' +
        (accent ? 'text-blue-400' : 'text-white')
      }>
        {value}
      </div>
    </div>
  )
}
