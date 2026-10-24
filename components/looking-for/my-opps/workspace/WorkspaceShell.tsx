'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Eye, PencilSimple, Warning } from '@phosphor-icons/react'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceTabs, type WorkspaceTab } from './WorkspaceTabs'
import { OverviewTab } from './tabs/OverviewTab'
import { ApplicantsTab } from './tabs/ApplicantsTab'
import { PipelineTab } from './tabs/PipelineTab'
import { MessagesTab } from './tabs/MessagesTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { DistributionTab } from './tabs/DistributionTab'
import { ActivityTab } from './tabs/ActivityTab'
import { AutomationTab } from './tabs/AutomationTab'
import { ComplianceTab } from './tabs/ComplianceTab'
import { SettingsTab } from './tabs/SettingsTab'
import { DsrtPage, DsrtButton, DsrtEmpty, DsrtSkeleton } from '@/components/dsrt'

export function WorkspaceShell({ opportunityId }: { opportunityId: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const initialTab = (sp.get('tab') as WorkspaceTab) || 'overview'

  const [tab, setTab] = useState<WorkspaceTab>(initialTab)
  const [opp, setOpp] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Failed')
      }
      setOpp(await res.json())
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    load()
  }, [load])

  const changeTab = (t: WorkspaceTab) => {
    setTab(t)
    const p = new URLSearchParams(sp.toString())
    if (t === 'overview') p.delete('tab')
    else p.set('tab', t)
    const qs = p.toString()
    router.replace(
      `/looking-for/my-opportunities/${opportunityId}${qs ? `?${qs}` : ''}`,
      { scroll: false }
    )
  }

  if (loading) {
    return (
      <DsrtPage width="wide" className="space-y-4 py-6">
        <DsrtSkeleton className="h-6 w-48" />
        <DsrtSkeleton className="h-20 w-full rounded-2xl" />
        <DsrtSkeleton className="h-10 w-full rounded-xl" />
        <DsrtSkeleton className="h-80 w-full rounded-2xl" />
      </DsrtPage>
    )
  }

  if (error || !opp) {
    return (
      <DsrtPage width="narrow" className="py-12">
        <DsrtEmpty
          icon={Warning}
          title={error || 'Opportunity workspace not found'}
          action={
            <DsrtButton asChild variant="outline" size="sm">
              <Link href="/looking-for/my-opportunities">
                <ArrowLeft size={12} weight="bold" />
                Back to My Opportunities
              </Link>
            </DsrtButton>
          }
        />
      </DsrtPage>
    )
  }

  return (
    <div className="min-h-screen bg-[#05070D] text-white">
      {/* Top sticky workspace header */}
      <header className="sticky top-0 z-30 bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pt-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <Link
              href="/looking-for/my-opportunities/portfolio"
              className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={12} weight="bold" />
              My Opportunities
            </Link>

            <div className="flex items-center gap-2">
              <DsrtButton asChild size="xs" variant="outline">
                <Link href={`/looking-for/${opp.slug || opp.id}`}>
                  <Eye size={12} />
                  <span className="hidden sm:inline">View Public</span>
                </Link>
              </DsrtButton>
              <DsrtButton asChild size="xs" variant="outline">
                <Link href={`/looking-for/create?edit=${opp.id}`}>
                  <PencilSimple size={12} />
                  <span className="hidden sm:inline">Edit</span>
                </Link>
              </DsrtButton>
            </div>
          </div>

          <WorkspaceHeader opp={opp} />
          <WorkspaceTabs active={tab} onChange={changeTab} />
        </div>
      </header>

      {/* Main workspace active tab container */}
      <main>
        <DsrtPage width="wide" className="py-6">
          {tab === 'overview' && (
            <OverviewTab opp={opp} onChangeTab={changeTab} onRefresh={load} />
          )}
          {tab === 'applicants' && <ApplicantsTab opportunityId={opp.id} />}
          {tab === 'pipeline' && <PipelineTab opportunityId={opp.id} />}
          {tab === 'messages' && <MessagesTab opportunityId={opp.id} />}
          {tab === 'performance' && <PerformanceTab opportunityId={opp.id} />}
          {tab === 'distribution' && <DistributionTab opportunityId={opp.id} />}
          {tab === 'activity' && <ActivityTab opportunityId={opp.id} />}
          {tab === 'automation' && <AutomationTab opportunityId={opp.id} />}
          {tab === 'compliance' && <ComplianceTab opportunityId={opp.id} />}
          {tab === 'settings' && <SettingsTab opp={opp} onRefresh={load} />}
        </DsrtPage>
      </main>
    </div>
  )
}