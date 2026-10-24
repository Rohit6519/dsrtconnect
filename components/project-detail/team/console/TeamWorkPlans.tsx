'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Target, WarningCircle, CheckCircle, Clock, X,
  CircleNotch, CalendarBlank, Warning, Info, Funnel, Kanban
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DsrtAvatar, DsrtPanel, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { ObjectiveStatus, ObjectivePriority } from '@/types/team'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
  isOwner: boolean
  currentUserId: string | null
}

interface Objective {
  id: string
  title: string
  description: string | null
  status: ObjectiveStatus
  priority: ObjectivePriority
  due_date: string | null
  blocked_reason: string | null
  owner_member_id: string | null
  owner?: {
    id: string
    role: string | null
    user?: {
      id: string
      full_name: string | null
      username: string | null
      avatar_url: string | null
    }
  }
}

const STATUS_CONFIG: Record<ObjectiveStatus, { label: string; color: string; dot: string }> = {
  assigned:        { label: 'Assigned',   color: 'text-white/60',       dot: 'bg-white/40' },
  in_progress:     { label: 'In Progress',color: 'text-[#38bdf8]',      dot: 'bg-[#38bdf8]' },
  awaiting_review: { label: 'Review',     color: 'text-amber-400',      dot: 'bg-amber-400' },
  blocked:         { label: 'Blocked',    color: 'text-red-400',        dot: 'bg-red-400' },
  completed:       { label: 'Completed',  color: 'text-emerald-400',    dot: 'bg-emerald-400' },
  deferred:        { label: 'Deferred',   color: 'text-white/40',       dot: 'bg-white/20' },
  cancelled:       { label: 'Cancelled',  color: 'text-white/40',       dot: 'bg-white/20' },
}

const PRIORITY_CONFIG: Record<ObjectivePriority, { label: string; color: string }> = {
  low:      { label: 'Low',      color: 'text-white/40' },
  normal:   { label: 'Normal',   color: 'text-blue-400' },
  high:     { label: 'High',     color: 'text-orange-400' },
  critical: { label: 'Critical', color: 'text-red-400' },
}

const FILTERS = [
  { id: 'all', label: 'All Work' },
  { id: 'my_work', label: 'My Work' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'completed', label: 'Completed' },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamWorkPlans({ projectId, slug, isOwner, currentUserId }: Props) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filter, setFilter] = useState('all')
  const [inspectedId, setInspectedId] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchObjectives = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      
      // Fetch objectives
      const { data: objs, error: objErr } = await supabase
        .from('project_team_objectives')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (objErr) throw objErr

      // Fetch member/user mappings efficiently in one go
      const memberIds = Array.from(new Set((objs || []).map(o => o.owner_member_id).filter(Boolean)))
      
      let membersMap: Record<string, any> = {}
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from('project_members')
          .select(`
            id, role,
            user:users!project_members_user_id_fkey(id, full_name, username, avatar_url)
          `)
          .in('id', memberIds)
          
        if (members) {
          membersMap = members.reduce((acc, m) => ({ ...acc, [m.id]: m }), {})
        }
      }

      const enriched = (objs || []).map(o => ({
        ...o,
        owner: o.owner_member_id ? membersMap[o.owner_member_id] : null
      }))

      if (isMountedRef.current) setObjectives(enriched)
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load work plans')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchObjectives() }, [fetchObjectives])

  // ─── DERIVED ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return objectives.filter(o => {
      if (filter === 'all') return true
      if (filter === 'my_work') return o.owner?.user?.id === currentUserId
      if (filter === 'in_progress') return o.status === 'in_progress' || o.status === 'assigned'
      if (filter === 'blocked') return o.status === 'blocked'
      if (filter === 'completed') return o.status === 'completed'
      return true
    })
  }, [objectives, filter, currentUserId])

  const inspectedObj = useMemo(() => objectives.find(o => o.id === inspectedId), [objectives, inspectedId])

  // ─── ACTIONS ─────────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, newStatus: ObjectiveStatus, blockedReason: string | null = null) => {
    const prev = objectives
    setObjectives(p => p.map(o => o.id === id ? { ...o, status: newStatus, blocked_reason: blockedReason } : o))
    
    try {
      const supabase = createClient()
      const { error: updErr } = await supabase
        .from('project_team_objectives')
        .update({ status: newStatus, blocked_reason: blockedReason })
        .eq('id', id)
        
      if (updErr) throw updErr
      toast.success('Status updated')
    } catch {
      setObjectives(prev)
      toast.error('Failed to update status')
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">Work Plans</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Track execution, objectives, and blocked work.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
        {FILTERS.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={cn(
              'px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors outline-none',
              filter === t.id
                ? 'text-[#38bdf8] border-[#38bdf8]'
                : 'text-white/45 border-transparent hover:text-white/75'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex gap-0">
        
        {/* Table Area */}
        <div className={cn(
          'transition-all duration-300 ease-in-out min-w-0',
          inspectedId ? 'w-full lg:w-[calc(100%-400px)]' : 'w-full'
        )}>
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <CircleNotch size={18} className="animate-spin text-white/30" />
              <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading...</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
              <WarningCircle size={22} weight="fill" className="text-red-400" />
              <span className="text-[13px] text-red-300">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
              <Kanban size={32} weight="fill" className="text-white/20 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-white/60 mb-1">No objectives found</p>
              <p className="text-[12.5px] text-white/40">
                {filter !== 'all' ? 'Try changing your filter.' : 'No work plans have been confirmed yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-[10.5px] font-mono uppercase tracking-wider text-white/40 font-bold whitespace-nowrap">Objective</th>
                      <th className="px-4 py-3 text-[10.5px] font-mono uppercase tracking-wider text-white/40 font-bold whitespace-nowrap">Assignee</th>
                      <th className="px-4 py-3 text-[10.5px] font-mono uppercase tracking-wider text-white/40 font-bold whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-[10.5px] font-mono uppercase tracking-wider text-white/40 font-bold whitespace-nowrap">Priority</th>
                      <th className="px-4 py-3 text-[10.5px] font-mono uppercase tracking-wider text-white/40 font-bold whitespace-nowrap text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered.map(obj => {
                      const status = STATUS_CONFIG[obj.status]
                      const pri = PRIORITY_CONFIG[obj.priority]
                      const isSelected = inspectedId === obj.id
                      
                      return (
                        <tr 
                          key={obj.id} 
                          onClick={() => setInspectedId(isSelected ? null : obj.id)}
                          className={cn(
                            "group cursor-pointer transition-colors",
                            isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                          )}
                        >
                          {/* Objective */}
                          <td className="px-4 py-3.5 max-w-[240px]">
                            <p className={cn("text-[13.5px] font-bold truncate transition-colors", isSelected ? "text-white" : "text-white/85 group-hover:text-white")}>
                              {obj.title}
                            </p>
                          </td>

                          {/* Assignee */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {obj.owner ? (
                              <div className="flex items-center gap-2">
                                <DsrtAvatar src={obj.owner.user?.avatar_url} name={obj.owner.user?.full_name || '?'} size="xs" />
                                <span className="text-[12.5px] text-white/70">{obj.owner.user?.full_name?.split(' ')[0]}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-white/30 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dot)} />
                              <span className={cn("text-[12px] font-medium", status.color)}>{status.label}</span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={cn("text-[11.5px] font-bold uppercase tracking-wider", pri.color)}>
                              {pri.label}
                            </span>
                          </td>

                          {/* Due */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            {obj.due_date ? (
                              <span className="text-[12px] text-white/50 font-mono">
                                {new Date(obj.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-[12px] text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Inspector Panel (slides in from right) */}
        {inspectedObj && (
          <ObjectiveInspector
            obj={inspectedObj}
            isOwner={isOwner}
            currentUserId={currentUserId}
            onClose={() => setInspectedId(null)}
            onStatusChange={(s, r) => handleStatusChange(inspectedObj.id, s, r)}
          />
        )}

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// OBJECTIVE INSPECTOR (Right Side Panel)
// ═══════════════════════════════════════════════════════════════════════════

function ObjectiveInspector({
  obj, isOwner, currentUserId, onClose, onStatusChange
}: {
  obj: Objective
  isOwner: boolean
  currentUserId: string | null
  onClose: () => void
  onStatusChange: (status: ObjectiveStatus, reason?: string | null) => void
}) {
  const status = STATUS_CONFIG[obj.status]
  const pri = PRIORITY_CONFIG[obj.priority]
  const isAssignee = obj.owner?.user?.id === currentUserId
  const canEdit = isOwner || isAssignee

  const [blocking, setBlocking] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  return (
    <div className="hidden lg:flex flex-col w-[400px] shrink-0 ml-6 animate-in slide-in-from-right-5 duration-200">
      <DsrtPanel padding="none" variant="default" className="overflow-hidden sticky top-[var(--dsrt-nav-h)] max-h-[calc(100vh-var(--dsrt-nav-h)-80px)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5 text-[11px] font-mono font-bold uppercase tracking-widest text-white/50">
            <Target size={14} weight="fill" /> Objective
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-6">
          
          {/* Title & Status */}
          <div>
            <h2 className="text-[20px] font-extrabold text-white leading-tight mb-3">
              {obj.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-white/[0.03] text-[11.5px] font-semibold", status.color, obj.status === 'blocked' ? 'border-red-500/30' : 'border-white/[0.08]')}>
                <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} /> {status.label}
              </span>
              <span className={cn("inline-flex items-center px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-[10px] font-mono font-bold uppercase tracking-wider", pri.color)}>
                {pri.label} Priority
              </span>
            </div>
          </div>

          {/* Blocked Reason Alert */}
          {obj.status === 'blocked' && obj.blocked_reason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <Warning size={16} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-red-300 mb-1">Blocked Reason</p>
                <p className="text-[13px] text-red-200/80 leading-relaxed">{obj.blocked_reason}</p>
              </div>
            </div>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-1.5 font-bold">Assignee</p>
              {obj.owner ? (
                <div className="flex items-center gap-2">
                  <DsrtAvatar src={obj.owner.user?.avatar_url} name={obj.owner.user?.full_name || '?'} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{obj.owner.user?.full_name}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-white/40 italic">Unassigned</p>
              )}
            </div>
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-1.5 font-bold">Due Date</p>
              {obj.due_date ? (
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                  <CalendarBlank size={14} weight="fill" className="text-white/50" />
                  {new Date(obj.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              ) : (
                <p className="text-[13px] text-white/40 italic">No due date</p>
              )}
            </div>
          </div>

          {/* Description */}
          {obj.description && (
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-2 font-bold">Details</p>
              <p className="text-[13.5px] text-white/80 leading-relaxed whitespace-pre-wrap">{obj.description}</p>
            </div>
          )}

          {/* Status Controls */}
          {canEdit && (
            <div className="pt-6 border-t border-white/[0.06]">
              <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-3 font-bold">Update Status</p>
              
              {blocking ? (
                <div className="bg-white/[0.02] border border-red-500/30 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95">
                  <label className="text-[12px] font-bold text-red-300 block">Why is this blocked?</label>
                  <textarea
                    autoFocus
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Missing API keys, waiting on design..."
                    className="w-full bg-black/40 border border-white/[0.1] rounded-lg p-3 text-[13px] text-white outline-none focus:border-red-400 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setBlocking(false)} className="px-3 h-8 text-[12px] font-medium text-white/50 hover:text-white">Cancel</button>
                    <button onClick={() => { onStatusChange('blocked', blockReason); setBlocking(false) }} disabled={!blockReason.trim()} className="px-4 h-8 bg-red-500 hover:bg-red-400 text-white font-bold text-[12px] rounded-lg disabled:opacity-50">Mark Blocked</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {obj.status !== 'in_progress' && (
                    <button onClick={() => onStatusChange('in_progress')} className="px-4 h-9 rounded-lg bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8]/20 border border-[#38bdf8]/20 text-[12.5px] font-bold transition-colors">
                      Start Work
                    </button>
                  )}
                  {obj.status !== 'completed' && (
                    <button onClick={() => onStatusChange('completed')} className="px-4 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[12.5px] font-bold transition-colors">
                      Complete
                    </button>
                  )}
                  {obj.status !== 'blocked' && (
                    <button onClick={() => setBlocking(true)} className="px-4 h-9 rounded-lg bg-white/[0.04] text-white/60 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-[12.5px] font-bold transition-colors">
                      Mark Blocked
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </DsrtPanel>
    </div>
  )
}