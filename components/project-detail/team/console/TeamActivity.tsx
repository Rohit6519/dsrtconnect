'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Pulse, CircleNotch, WarningCircle, UserPlus, ShieldCheck,
  EnvelopeSimple, CheckCircle, XCircle, Prohibit, Clock, Target,
  Briefcase, Kanban, Eye, Pause, Trash, PencilSimple, Play, User
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { DsrtAvatar } from '@/components/dsrt'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
}

interface ActivityEvent {
  id: string
  event_type: string
  title: string
  summary: string | null
  metadata: Record<string, any>
  created_at: string
  actor?: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
  subject?: {
    user?: {
      full_name: string | null
      username: string | null
      avatar_url: string | null
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ICONS & COLORS BY EVENT TYPE
// ═══════════════════════════════════════════════════════════════════════════

const EVENT_STYLES: Record<string, { icon: any; color: string }> = {
  // Invitations
  invitation_sent:      { icon: EnvelopeSimple, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  invitation_viewed:    { icon: Eye,            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  invitation_accepted:  { icon: CheckCircle,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  invitation_declined:  { icon: XCircle,        color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  invitation_revoked:   { icon: Prohibit,       color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  invitation_expired:   { icon: Clock,          color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  
  // Onboarding
  onboarding_started:   { icon: UserPlus,       color: 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20' },
  onboarding_completed: { icon: CheckCircle,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  
  // Membership
  member_activated:     { icon: UserPlus,       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  member_paused:        { icon: Pause,          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  member_removed:       { icon: Trash,          color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  
  // Roles & Access
  role_changed:         { icon: Briefcase,      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  permissions_changed:  { icon: ShieldCheck,    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  access_reviewed:      { icon: ShieldCheck,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  
  // Work
  objective_assigned:   { icon: Target,         color: 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/20' },
  objective_updated:    { icon: PencilSimple,   color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  objective_completed:  { icon: CheckCircle,    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  objective_blocked:    { icon: WarningCircle,  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  objective_unblocked:  { icon: Play,           color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  work_plan_confirmed:  { icon: Kanban,         color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
}

const DEFAULT_STYLE = { icon: Pulse, color: 'text-zinc-400 bg-white/[0.04] border-white/[0.08]' }

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatTimeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function groupEventsByDay(events: ActivityEvent[]) {
  const groups: { label: string; dateStr: string; items: ActivityEvent[] }[] = []
  
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  events.forEach(e => {
    const d = new Date(e.created_at)
    const ds = d.toDateString()
    
    let label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (ds === today) label = 'Today'
    else if (ds === yesterday) label = 'Yesterday'

    const existing = groups.find(g => g.dateStr === ds)
    if (existing) existing.items.push(e)
    else groups.push({ label, dateStr: ds, items: [e] })
  })
  
  return groups
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamActivity({ projectId }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: dbErr } = await supabase
        .from('project_team_activity_events')
        .select(`
          id, event_type, title, summary, metadata, created_at,
          actor:users!project_team_activity_events_actor_id_fkey(id, full_name, username, avatar_url),
          subject:project_members!project_team_activity_events_subject_member_id_fkey(
            user:users!project_members_user_id_fkey(full_name, username, avatar_url)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (dbErr) throw dbErr
      if (isMountedRef.current) setEvents((data || []) as any[])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load activity')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchActivity() }, [fetchActivity])

  const grouped = groupEventsByDay(events)

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">Audit Timeline</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Immutable ledger of all team operations, access changes, and execution updates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <CircleNotch size={18} className="animate-spin text-white/30" />
          <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading timeline...</span>
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
          <WarningCircle size={22} className="text-red-400" />
          <span className="text-[13px] text-red-300">{error}</span>
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
          <Pulse size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-white/60 mb-1">No activity yet</p>
          <p className="text-[12.5px] text-white/40">
            Team operations will be logged here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group, gIdx) => (
            <div key={group.dateStr}>
              {/* Day Header */}
              <div className="flex items-center gap-4 mb-4">
                <h4 className="text-[11px] font-mono uppercase tracking-widest text-white/50 font-bold shrink-0">
                  {group.label}
                </h4>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Day Events */}
              <div className="space-y-5">
                {group.items.map((e, iIdx) => {
                  const style = EVENT_STYLES[e.event_type] || DEFAULT_STYLE
                  const Icon = style.icon
                  const isLastInGroup = iIdx === group.items.length - 1
                  const isVeryLast = gIdx === grouped.length - 1 && isLastInGroup

                  return (
                    <div key={e.id} className="relative flex items-start gap-4 group">
                      
                      {/* Timeline Line */}
                      {!isVeryLast && (
                        <div className="absolute left-[15px] top-[30px] bottom-[-20px] w-px bg-white/[0.06] group-hover:bg-white/[0.1] transition-colors" />
                      )}

                      {/* Icon Circle */}
                      <div className={cn(
                        "relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center border shrink-0 mt-1 shadow-sm transition-colors",
                        style.color
                      )}>
                        <Icon size={14} weight="fill" />
                      </div>

                      {/* Content Box */}
                      <div className="flex-1 min-w-0 bg-[#121215] border border-white/[0.06] rounded-xl p-4 hover:bg-[#15151a] hover:border-white/[0.1] transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1.5">
                          <p className="text-[13.5px] font-semibold text-white leading-snug">
                            {e.title}
                          </p>
                          <span className="text-[11px] font-mono text-white/40 shrink-0 sm:mt-0.5">
                            {formatTimeOnly(e.created_at)}
                          </span>
                        </div>
                        
                        {e.summary && (
                          <p className="text-[12.5px] text-white/60 leading-relaxed mb-3">
                            {e.summary}
                          </p>
                        )}

                        {/* Actor / Subject Context */}
                        {e.actor && (
                          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
                            <DsrtAvatar src={e.actor.avatar_url} name={e.actor.full_name || '?'} size="xs" />
                            <span className="text-[11.5px] text-white/50">
                              Action by <strong className="text-white/80">{e.actor.full_name}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}