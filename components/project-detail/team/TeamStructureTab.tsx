'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users, UserList, EnvelopeSimple, ShieldCheck,
  Kanban, Graph, Pulse, Gear, Briefcase, Plus, LockKey,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { DsrtPanel, DsrtButton } from '@/components/dsrt'

// Real components from prior phases
import { TeamOverview } from './TeamOverview'
import { TeamPeople } from './TeamPeople'
import { InvitationsManager } from './console/InvitationsManager'
import { RolesManager } from './console/RolesManager'
import { TeamWorkPlans } from './console/TeamWorkPlans'
import { TeamActivity } from './console/TeamActivity'
import { TeamSettings } from './console/TeamSettings'
import { TeamGraph } from './graph/TeamGraph'
import { TeamAddMemberComposer } from './composer/TeamAddMemberComposer'
import { AccessReviewDashboard } from './console/AccessReviewDashboard'
import { useTeamCommands } from './hooks/useTeamCommands'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  projectId: string
  isOwner: boolean
  currentUserId: string | null
}

type TeamSubTabId =
  | 'overview'
  | 'people'
  | 'invitations'
  | 'roles'
  | 'work-plans'
  | 'graph'
  | 'activity'
  | 'settings'

interface TeamSubTabDef {
  id: TeamSubTabId
  label: string
  icon: any
  requiresOwner: boolean
}

const TEAM_TABS: TeamSubTabDef[] = [
  { id: 'overview',    label: 'Overview',       icon: Briefcase,      requiresOwner: false },
  { id: 'people',      label: 'People',         icon: UserList,       requiresOwner: false },
  { id: 'graph',       label: 'Team Graph',     icon: Graph,          requiresOwner: false },
  { id: 'work-plans',  label: 'Work Plans',     icon: Kanban,         requiresOwner: false },
  { id: 'invitations', label: 'Invitations',    icon: EnvelopeSimple, requiresOwner: true  },
  { id: 'roles',       label: 'Roles & Access', icon: ShieldCheck,    requiresOwner: true  },
  { id: 'activity',    label: 'Activity',       icon: Pulse,          requiresOwner: true  },
  { id: 'settings',    label: 'Settings',       icon: Gear,           requiresOwner: true  },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamStructureTab({ slug, projectId, isOwner, currentUserId }: Props) {
  const searchParams = useSearchParams()

  // ─── Register Cmd+K team shortcuts ──────────────────────────────────
  useTeamCommands(slug, projectId, isOwner)

  // ─── Sub-Tab Routing ─────────────────────────────────────────────────
  const activeSubTab = ((): TeamSubTabId => {
    const sub = searchParams?.get('sub') as TeamSubTabId | null
    if (sub && TEAM_TABS.find(t => t.id === sub)) return sub
    return 'overview'
  })()

  // ─── Summary Data ────────────────────────────────────────────────────
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ─── Add Member Composer ─────────────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false)

  // ─── Refresh Key (bumps after successful invite to refresh lists) ────
  const [refreshKey, setRefreshKey] = useState(0)

  // ─── Fetch Summary ───────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_project_team_summary', {
        p_project_id: projectId,
      })
      if (!error && data) {
        setSummary(data)
      }
    } catch (e) {
      console.error('[TeamShell] Summary fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary, refreshKey])

  // ─── Navigation ──────────────────────────────────────────────────────
  const handleTabChange = (next: TeamSubTabId) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'team')
    params.set('sub', next)
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  // ─── Composer Callbacks ──────────────────────────────────────────────
  const openComposer = useCallback(() => setComposerOpen(true), [])
  const closeComposer = useCallback(() => setComposerOpen(false), [])
  const handleComposerSuccess = useCallback(() => {
    setComposerOpen(false)
    setRefreshKey(k => k + 1)
    fetchSummary()
  }, [fetchSummary])

  // ─── Visibility ──────────────────────────────────────────────────────
  const activeTabDef = TEAM_TABS.find(t => t.id === activeSubTab)
  const isForbidden = activeTabDef?.requiresOwner && !isOwner

  const visibleTabs = useMemo(() => {
    return TEAM_TABS.filter(t => !t.requiresOwner || isOwner)
  }, [isOwner])

  return (
    <div className="space-y-6">

      {/* ─── HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-white tracking-tight leading-tight">
            TEAM
          </h2>
          <p className="text-[13.5px] text-white/50 mt-1 font-medium">
            Your people, responsibilities and execution structure.
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <DsrtButton
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('graph')}
            >
              <Graph size={14} weight="fill" /> Team Graph
            </DsrtButton>
            <DsrtButton
              variant="primary"
              size="sm"
              className="bg-white text-black hover:bg-white/90"
              onClick={openComposer}
            >
              <Plus size={14} weight="bold" /> Add member
            </DsrtButton>
          </div>
        )}
      </div>

      {/* ─── METRICS BAR ──────────────────────────────────────────────── */}
      <DsrtPanel padding="none" variant="default" className="overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.06]">
          <MetricCell
            label="Members"
            value={summary?.total_members}
            loading={loading}
          />
          <MetricCell
            label="Pending"
            value={summary?.pending_invitations}
            loading={loading}
          />
          <MetricCell
            label="Roles"
            value={summary?.total_roles}
            loading={loading}
          />
          <MetricCell
            label="Active Assignments"
            value={summary?.active_objectives}
            loading={loading}
          />
        </div>
      </DsrtPanel>

      {/* ─── SUB-NAVIGATION ───────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
        {visibleTabs.map(t => {
          const active = activeSubTab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3.5 text-[13.5px] font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors outline-none',
                active
                  ? 'text-[#38bdf8] border-[#38bdf8]'
                  : 'text-white/45 border-transparent hover:text-white/75'
              )}
            >
              <Icon size={16} weight={active ? 'fill' : 'regular'} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ─── CONTENT ROUTER ───────────────────────────────────────────── */}
      <div className="min-h-[400px]">
        {isForbidden ? (
          <ForbiddenPanel />
        ) : (
          <>
            {activeSubTab === 'overview' && (
              <TeamOverview
                key={`overview-${refreshKey}`}
                projectId={projectId}
                slug={slug}
                summary={summary}
              />
            )}

            {activeSubTab === 'people' && (
              <TeamPeople
                key={`people-${refreshKey}`}
                projectId={projectId}
                slug={slug}
                isOwner={isOwner}
                currentUserId={currentUserId}
                onAddMember={openComposer}
              />
            )}

            {activeSubTab === 'invitations' && (
              <InvitationsManager
                key={`invitations-${refreshKey}`}
                projectId={projectId}
                slug={slug}
                onOpenComposer={openComposer}
              />
            )}

            {activeSubTab === 'roles' && (
              <div className="space-y-8">
                <RolesManager
                  key={`roles-${refreshKey}`}
                  projectId={projectId}
                  slug={slug}
                />
                {isOwner && (
                  <AccessReviewDashboard
                    key={`review-${refreshKey}`}
                    projectId={projectId}
                    slug={slug}
                  />
                )}
              </div>
            )}

            {activeSubTab === 'work-plans' && (
              <TeamWorkPlans
                key={`work-plans-${refreshKey}`}
                projectId={projectId}
                slug={slug}
                isOwner={isOwner}
                currentUserId={currentUserId}
              />
            )}

            {activeSubTab === 'graph' && (
              <TeamGraph
                key={`graph-${refreshKey}`}
                projectId={projectId}
                slug={slug}
                isOwner={isOwner}
              />
            )}

            {activeSubTab === 'activity' && (
              <TeamActivity
                key={`activity-${refreshKey}`}
                projectId={projectId}
              />
            )}

            {activeSubTab === 'settings' && isOwner && (
              <TeamSettings
                key={`settings-${refreshKey}`}
                projectId={projectId}
                slug={slug}
                isOwner={isOwner}
              />
            )}
          </>
        )}
      </div>

      {/* ─── ADD MEMBER COMPOSER (Portal) ─────────────────────────────── */}
      {composerOpen && (
        <TeamAddMemberComposer
          slug={slug}
          projectId={projectId}
          onClose={closeComposer}
          onSuccess={handleComposerSuccess}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MetricCell({
  label,
  value,
  loading,
}: {
  label: string
  value?: number
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 bg-[#0a0a0f] hover:bg-white/[0.02] transition-colors">
      <span className="text-[15px] font-bold text-white tabular-nums w-6">
        {loading ? '-' : (value || 0)}
      </span>
      <span className="text-[12.5px] font-semibold text-white/50">
        {label}
      </span>
    </div>
  )
}

function ForbiddenPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center border border-white/[0.04] bg-white/[0.01] rounded-3xl">
      <LockKey size={40} weight="duotone" className="text-white/20 mb-4" />
      <p className="text-[15px] font-bold text-white mb-1">Access Restricted</p>
      <p className="text-[13px] text-white/50">
        Only the project owner can view team settings and invitations.
      </p>
    </div>
  )
}