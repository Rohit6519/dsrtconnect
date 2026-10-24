'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DsrtAvatar } from '@/components/dsrt'
import { CircleNotch, WarningCircle } from '@phosphor-icons/react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
  summary: any
}

interface TeamMember {
  id: string
  user_id: string
  role: string | null
  department: string | null
  member_state: string
  user?: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
  responsibilities: Array<{
    id: string
    title: string
    is_primary: boolean
  }>
  active_objectives_count: number
  blocked_objectives_count: number
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamOverview({ projectId, slug, summary }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: rpcErr } = await supabase.rpc('list_project_team_members', {
        p_project_id: projectId,
        p_include_removed: false,
      })

      if (rpcErr) throw rpcErr
      if (isMountedRef.current) setMembers(data || [])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load team')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // ─── DERIVED DATA ───────────────────────────────────────────────────

  // Execution math
  const activeObj = summary?.active_objectives || 0
  const inProgress = summary?.in_progress || 0
  const awaiting = summary?.awaiting_review || 0
  const blocked = summary?.blocked || 0
  const assignedOnly = Math.max(0, activeObj - inProgress - awaiting)

  const depts = Array.isArray(summary?.departments) ? summary.departments : []

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <CircleNotch size={20} className="animate-spin text-white/30" />
        <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading overview...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
        <WarningCircle size={24} className="text-red-400" />
        <span className="text-[13px] text-red-300">{error}</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      
      {/* ─── LEFT: ACTIVE TEAM ────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-3">
        <div className="px-1 mb-2">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold">
            Active Team
          </h3>
        </div>

        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="p-6 border border-white/[0.04] bg-white/[0.01] rounded-xl text-center text-[13px] text-white/40">
              No active team members found.
            </div>
          ) : (
            members.map(member => <MemberRow key={member.id} member={member} />)
          )}
        </div>
      </div>

      {/* ─── RIGHT: EXECUTION & STRUCTURE ─────────────────────────────── */}
      <div className="space-y-6">
        
        {/* Execution Block */}
        <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold mb-5">
            Execution
          </h3>
          <div className="space-y-4">
            <p className="text-[13.5px] font-semibold text-white">Current Work</p>
            <div className="h-px bg-white/[0.06] w-full" />
            <div className="space-y-3">
              <ExecutionRow label="Assigned" count={assignedOnly} />
              <ExecutionRow label="In progress" count={inProgress} highlight="text-[#38bdf8]" />
              <ExecutionRow label="Blocked" count={blocked} highlight="text-red-400" />
              <ExecutionRow label="Awaiting review" count={awaiting} highlight="text-amber-400" />
            </div>
          </div>
        </div>

        {/* Structure Block */}
        <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold mb-5">
            Team Structure
          </h3>
          <div className="space-y-3">
            {depts.length === 0 ? (
              <p className="text-[12.5px] text-white/40">No departments defined.</p>
            ) : (
              depts.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[13.5px]">
                  <span className="text-white/80 font-medium">{d.name}</span>
                  <span className="font-mono text-white/50">{d.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MemberRow({ member }: { member: TeamMember }) {
  const isPending = ['invited', 'viewed'].includes(member.member_state)
  const isPaused = ['paused', 'offboarding'].includes(member.member_state)
  
  const statusColor = 
    isPending ? 'bg-amber-400' :
    isPaused ? 'bg-orange-400' :
    'bg-emerald-400'

  const respsCount = member.responsibilities?.length || 0

  // Build the secondary text line (e.g. "Product · AI · Engineering")
  // We use department + primary responsibilities up to 3 items
  const tags = [member.department]
    .concat(member.responsibilities.filter(r => r.is_primary).map(r => r.title))
    .filter(Boolean)
    .slice(0, 3)

  const tagsLine = tags.length > 0 ? tags.join(' · ') : 'General'

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] rounded-xl transition-colors">
      <div className="flex gap-4 min-w-0">
        <DsrtAvatar 
          src={member.user?.avatar_url} 
          name={member.user?.full_name || member.user?.username || 'Member'} 
          size="md" 
          className="shrink-0 mt-0.5"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[15px] font-bold text-white truncate">
              {member.user?.full_name || member.user?.username || 'Pending Invite'}
            </span>
          </div>
          <div className="text-[12.5px] text-white/60 mb-2.5 truncate">
            {tagsLine}
          </div>
          <div className="text-[12px] font-medium text-white/80 flex items-center gap-1.5">
            {respsCount} active responsibilit{respsCount === 1 ? 'y' : 'ies'}
          </div>
        </div>
      </div>

      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:min-w-[140px] shrink-0 sm:h-full">
        <span className="text-[10.5px] font-mono uppercase tracking-wider text-white/50 font-bold text-right truncate max-w-[140px]">
          {member.role || 'Member'}
        </span>
        <div className="flex items-center gap-2 sm:mt-auto">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          <span className="text-[12px] text-white/60 capitalize font-medium">
            {member.member_state}
          </span>
        </div>
      </div>
    </div>
  )
}

function ExecutionRow({ label, count, highlight }: { label: string; count: number; highlight?: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={highlight ? highlight : 'text-white/70'}>{label}</span>
      <span className="font-mono text-white/50">{count}</span>
    </div>
  )
}