'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MagnifyingGlass, X, UserPlus, CircleNotch, WarningCircle, CaretRight
} from '@phosphor-icons/react'
import { DsrtAvatar, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { TeamMember, MemberState } from '@/types/team'

// Use the shared Inspector we built in Phase 11.23
import { MemberInspector } from './MemberInspector'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
  isOwner: boolean
  currentUserId: string | null
  onAddMember?: () => void
}

interface FilterState {
  search: string
  state: MemberState | 'all'
  department: string | 'all'
}

const STATE_TABS: Array<{ id: MemberState | 'all'; label: string }> = [
  { id: 'all',         label: 'All' },
  { id: 'active',      label: 'Active' },
  { id: 'invited',     label: 'Invited' },
  { id: 'onboarding',  label: 'Onboarding' },
  { id: 'paused',      label: 'Paused' },
  { id: 'removed',     label: 'Removed' },
]

const STATE_DOT_COLOR: Record<string, string> = {
  active:      'bg-emerald-400',
  invited:     'bg-amber-400',
  viewed:      'bg-amber-400',
  accepted:    'bg-blue-400',
  onboarding:  'bg-blue-400',
  paused:      'bg-orange-400',
  offboarding: 'bg-orange-400',
  removed:     'bg-white/30',
  declined:    'bg-red-400',
  expired:     'bg-white/20',
  revoked:     'bg-white/20',
}

const STATE_LABEL: Record<string, string> = {
  active:      'Active',
  invited:     'Invited',
  viewed:      'Viewed invite',
  accepted:    'Accepted',
  onboarding:  'Onboarding',
  paused:      'Paused',
  offboarding: 'Offboarding',
  removed:     'Removed',
  declined:    'Declined',
  expired:     'Expired',
  revoked:     'Revoked',
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamPeople({ projectId, slug, isOwner, currentUserId, onAddMember }: Props) {
  // ─── Data ────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Filters ─────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    state: 'all',
    department: 'all',
  })

  // ─── Inspector ───────────────────────────────────────────────────────
  const [inspectedMemberId, setInspectedMemberId] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ─── Fetch ───────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const includeRemoved = filters.state === 'removed' || filters.state === 'all'
      const { data, error: rpcErr } = await supabase.rpc('list_project_team_members', {
        p_project_id: projectId,
        p_include_removed: includeRemoved,
      })
      if (rpcErr) throw rpcErr
      if (isMountedRef.current) setMembers((data || []) as TeamMember[])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load team')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId, filters.state])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  // ─── Derived ─────────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const set = new Set<string>()
    for (const m of members) {
      if (m.department) set.add(m.department)
    }
    return Array.from(set).sort()
  }, [members])

  const filtered = useMemo(() => {
    let list = members

    // State filter
    if (filters.state !== 'all') {
      if (filters.state === 'invited') {
        list = list.filter(m => ['invited', 'viewed'].includes(m.member_state))
      } else {
        list = list.filter(m => m.member_state === filters.state)
      }
    }

    // Department filter
    if (filters.department !== 'all') {
      list = list.filter(m => m.department === filters.department)
    }

    // Search
    const q = filters.search.trim().toLowerCase()
    if (q.length >= 2) {
      list = list.filter(m => {
        const name = (m.user?.full_name || '').toLowerCase()
        const uname = (m.user?.username || '').toLowerCase()
        const role = (m.role || '').toLowerCase()
        const dept = (m.department || '').toLowerCase()
        return name.includes(q) || uname.includes(q) || role.includes(q) || dept.includes(q)
      })
    }

    return list
  }, [members, filters])

  // Count per state for tabs
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = { all: members.length }
    for (const m of members) {
      const key = ['invited', 'viewed'].includes(m.member_state) ? 'invited' : m.member_state
      counts[key] = (counts[key] || 0) + 1
    }
    return counts
  }, [members])

  const inspectedMember = useMemo(
    () => members.find(m => m.id === inspectedMemberId) || null,
    [members, inspectedMemberId]
  )

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-in fade-in duration-300">

      {/* ─── HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">People</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Everyone on your team across all states.
          </p>
        </div>
        {isOwner && onAddMember && (
          <DsrtButton
            variant="primary"
            size="sm"
            className="bg-white text-black hover:bg-white/90"
            onClick={onAddMember}
          >
            <UserPlus size={14} weight="bold" /> Add member
          </DsrtButton>
        )}
      </div>

      {/* ─── SEARCH + DEPARTMENT FILTER ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={14}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search by name, role, department..."
            className="w-full h-11 pl-9 pr-8 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[13.5px] font-medium text-white placeholder:text-white/30 outline-none focus:border-white/[0.2] focus:bg-white/[0.05] transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
              aria-label="Clear search"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>

        {departments.length > 0 && (
          <select
            value={filters.department}
            onChange={e => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="h-11 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-[13.5px] font-semibold text-white outline-none focus:border-white/[0.2] cursor-pointer min-w-[160px] [color-scheme:dark]"
          >
            <option value="all" className="bg-[#12121a]">All departments</option>
            {departments.map(d => (
              <option key={d} value={d} className="bg-[#12121a]">{d}</option>
            ))}
          </select>
        )}
      </div>

      {/* ─── STATE TABS ───────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
        {STATE_TABS.map(tab => {
          // Only show tabs that have members (plus "All")
          const count = stateCounts[tab.id] || 0
          if (tab.id !== 'all' && count === 0 && !isOwner) return null

          const active = filters.state === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setFilters(prev => ({ ...prev, state: tab.id as MemberState | 'all' }))}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-[13.5px] font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors outline-none',
                active
                  ? 'text-[#38bdf8] border-[#38bdf8]'
                  : 'text-white/45 border-transparent hover:text-white/75'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-mono font-bold px-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full',
                  active
                    ? 'bg-[#38bdf8]/20 text-[#7dd3fc] border border-[#38bdf8]/30'
                    : 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── CONTENT ──────────────────────────────────────────────────── */}
      <div className="flex gap-0">

        {/* Member List (shrinks when inspector is open) */}
        <div className={cn(
          'transition-all duration-300 ease-in-out min-w-0',
          inspectedMemberId ? 'w-full lg:w-[calc(100%-404px)]' : 'w-full'
        )}>
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <CircleNotch size={20} className="animate-spin text-white/30" />
              <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider font-bold">Loading members...</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
              <WarningCircle size={24} weight="fill" className="text-red-400" />
              <span className="text-[13.5px] font-semibold text-red-300">{error}</span>
              <button onClick={fetchMembers} className="text-[12.5px] font-bold text-white/60 hover:text-white mt-1 border border-white/[0.1] px-4 py-1.5 rounded-lg transition-colors">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
              <p className="text-[15px] font-bold text-white/60 mb-1">
                {filters.search || filters.state !== 'all' || filters.department !== 'all'
                  ? 'No members match these filters.'
                  : 'No team members yet.'}
              </p>
              <p className="text-[13px] text-white/40">
                {isOwner && 'Add your first team member to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(member => (
                <MemberListRow
                  key={member.id}
                  member={member}
                  isSelected={inspectedMemberId === member.id}
                  onClick={() => setInspectedMemberId(
                    inspectedMemberId === member.id ? null : member.id
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inspector Panel (slides in from right via Shared Component) */}
        {inspectedMember && (
          <MemberInspector
            member={inspectedMember}
            slug={slug}
            isOwner={isOwner}
            currentUserId={currentUserId}
            onClose={() => setInspectedMemberId(null)}
          />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER LIST ROW
// ═══════════════════════════════════════════════════════════════════════════

function MemberListRow({
  member,
  isSelected,
  onClick,
}: {
  member: TeamMember
  isSelected: boolean
  onClick: () => void
}) {
  const stateKey = member.member_state
  const dotColor = STATE_DOT_COLOR[stateKey] || 'bg-white/30'
  const stateLabel = STATE_LABEL[stateKey] || stateKey

  const resps = member.responsibilities || []
  const primaryResps = resps.filter(r => r.is_primary).map(r => r.title)
  const tagsLine = [member.department, ...primaryResps].filter(Boolean).slice(0, 3).join(' · ')

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all',
        isSelected
          ? 'bg-[#38bdf8]/5 border border-[#38bdf8]/30 shadow-[0_0_20px_rgba(56,189,248,0.05)]'
          : 'bg-white/[0.015] border border-white/[0.06] hover:bg-white/[0.03] hover:border-white/[0.1]'
      )}
    >
      <DsrtAvatar
        src={member.user?.avatar_url}
        name={member.user?.full_name || 'M'}
        size="lg"
        className="shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15.5px] font-bold text-white truncate">
            {member.user?.full_name || member.user?.username || 'Pending'}
          </span>
          {member.user?.username && (
            <span className="text-[12px] font-mono text-white/35 hidden sm:inline">
              @{member.user.username}
            </span>
          )}
        </div>
        {tagsLine && (
          <p className="text-[13px] font-medium text-white/55 truncate mb-1">{tagsLine}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[11.5px] font-medium text-white/45">
          {resps.length > 0 && (
            <span>{resps.length} responsibilit{resps.length === 1 ? 'y' : 'ies'}</span>
          )}
          {(member.active_objectives_count || 0) > 0 && (
            <span>{member.active_objectives_count} objective{member.active_objectives_count === 1 ? '' : 's'}</span>
          )}
          {(member.blocked_objectives_count || 0) > 0 && (
            <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">{member.blocked_objectives_count} blocked</span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-2 shrink-0 min-w-[120px]">
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold text-right truncate max-w-[140px]">
          {member.role || 'Member'}
        </span>
        <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-md">
          <span className={cn('w-1.5 h-1.5 rounded-full shadow-sm', dotColor)} />
          <span className="text-[11.5px] text-white/70 font-semibold">{stateLabel}</span>
        </div>
      </div>

      <CaretRight size={16} weight="bold" className="text-white/25 shrink-0 hidden sm:block ml-1" />
    </button>
  )
}