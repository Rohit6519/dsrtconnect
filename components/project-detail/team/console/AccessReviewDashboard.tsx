'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, CheckCircle, WarningCircle, CircleNotch,
  Clock, ArrowRight, X, Check, Minus
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DsrtAvatar, DsrtPanel, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types/team'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
}

interface ReviewableItem {
  member: TeamMember
  daysSinceReview: number
  isOverdue: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AccessReviewDashboard({ projectId, slug }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [cadenceDays, setCadenceDays] = useState(90)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Review modal
  const [reviewingMember, setReviewingMember] = useState<TeamMember | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      // Get settings
      const { data: settings } = await supabase
        .from('project_team_settings')
        .select('access_review_cadence_days')
        .eq('project_id', projectId)
        .maybeSingle()

      if (settings?.access_review_cadence_days) {
        setCadenceDays(settings.access_review_cadence_days)
      }

      // Get members
      const { data, error: rpcErr } = await supabase.rpc('list_project_team_members', {
        p_project_id: projectId,
        p_include_removed: false,
      })

      if (rpcErr) throw rpcErr
      if (isMountedRef.current) setMembers((data || []) as TeamMember[])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load review data')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Compute Review Items ────────────────────────────────────────────
  const reviewItems: ReviewableItem[] = members
    .filter(m => m.member_state === 'active')
    .map(m => {
      const lastReview = m.last_reviewed_at
        ? new Date(m.last_reviewed_at).getTime()
        : m.accepted_at
        ? new Date(m.accepted_at).getTime()
        : m.joined_at
        ? new Date(m.joined_at).getTime()
        : 0

      const daysSinceReview = lastReview > 0
        ? Math.floor((Date.now() - lastReview) / 86400000)
        : 999

      return {
        member: m,
        daysSinceReview,
        isOverdue: daysSinceReview >= cadenceDays,
      }
    })
    .sort((a, b) => b.daysSinceReview - a.daysSinceReview)

  const overdueCount = reviewItems.filter(r => r.isOverdue).length
  const upcomingCount = reviewItems.filter(r => !r.isOverdue && r.daysSinceReview >= cadenceDays * 0.7).length

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">Access Review</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Periodic audit of team member permissions. Current cadence: every {cadenceDays} days.
          </p>
        </div>
      </div>

      {/* Summary Strip */}
      <DsrtPanel padding="none" variant="default" className="overflow-hidden mb-6">
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <SummaryCell
            label="Overdue"
            value={overdueCount}
            loading={loading}
            highlight={overdueCount > 0}
            highlightColor="text-red-400"
          />
          <SummaryCell
            label="Upcoming"
            value={upcomingCount}
            loading={loading}
          />
          <SummaryCell
            label="Reviewed"
            value={reviewItems.length - overdueCount - upcomingCount}
            loading={loading}
            highlightColor="text-emerald-400"
          />
        </div>
      </DsrtPanel>

      {/* Content */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <CircleNotch size={18} className="animate-spin text-white/30" />
          <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading reviews...</span>
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
          <WarningCircle size={22} weight="fill" className="text-red-400" />
          <span className="text-[13px] text-red-300">{error}</span>
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="py-16 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
          <ShieldCheck size={32} weight="fill" className="text-white/20 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-white/60 mb-1">No active members to review</p>
          <p className="text-[12.5px] text-white/40">
            Once members are active, they will appear here for periodic access audits.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Overdue Section */}
          {overdueCount > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <WarningCircle size={14} weight="fill" className="text-red-400" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-red-400 font-bold">
                  Overdue ({overdueCount})
                </span>
              </div>
              <div className="space-y-2">
                {reviewItems.filter(r => r.isOverdue).map(item => (
                  <ReviewRow
                    key={item.member.id}
                    item={item}
                    cadenceDays={cadenceDays}
                    onReview={() => setReviewingMember(item.member)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Up to date Section */}
          {reviewItems.filter(r => !r.isOverdue).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <CheckCircle size={14} weight="fill" className="text-emerald-400" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  Up to Date ({reviewItems.filter(r => !r.isOverdue).length})
                </span>
              </div>
              <div className="space-y-2">
                {reviewItems.filter(r => !r.isOverdue).map(item => (
                  <ReviewRow
                    key={item.member.id}
                    item={item}
                    cadenceDays={cadenceDays}
                    onReview={() => setReviewingMember(item.member)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewingMember && (
        <ReviewModal
          member={reviewingMember}
          projectId={projectId}
          slug={slug}
          onClose={() => setReviewingMember(null)}
          onCompleted={() => {
            setReviewingMember(null)
            fetchData() // Refresh the list
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW ROW
// ═══════════════════════════════════════════════════════════════════════════

function ReviewRow({
  item, cadenceDays, onReview,
}: {
  item: ReviewableItem
  cadenceDays: number
  onReview: () => void
}) {
  const { member, daysSinceReview, isOverdue } = item

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors",
      isOverdue
        ? "bg-red-500/[0.03] border-red-500/20 hover:bg-red-500/[0.06]"
        : "bg-white/[0.015] border-white/[0.06] hover:bg-white/[0.03]"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <DsrtAvatar
          src={member.user?.avatar_url}
          name={member.user?.full_name || '?'}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-white truncate">
            {member.user?.full_name}
          </p>
          <p className="text-[12px] text-white/50 truncate">
            {member.role || 'Member'} · {member.department || 'No department'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[240px] shrink-0">
        <div className="text-left sm:text-right">
          <div className={cn(
            "flex items-center gap-1.5 text-[12px] font-bold",
            isOverdue ? "text-red-400" : "text-white/50"
          )}>
            <Clock size={13} weight="fill" />
            {daysSinceReview === 999 ? 'Never reviewed' : `${daysSinceReview} days ago`}
          </div>
          {isOverdue && (
            <p className="text-[10.5px] font-mono text-red-300 mt-0.5">
              {daysSinceReview - cadenceDays} days overdue
            </p>
          )}
        </div>
        <button
          onClick={onReview}
          className={cn(
            "h-9 px-4 rounded-lg text-[12.5px] font-bold flex items-center gap-1.5 transition-colors",
            isOverdue
              ? "bg-red-500 hover:bg-red-400 text-white shadow-sm"
              : "bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/[0.08]"
          )}
        >
          Review <ArrowRight size={12} weight="bold" />
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════

function ReviewModal({
  member, projectId, slug, onClose, onCompleted,
}: {
  member: TeamMember
  projectId: string
  slug: string
  onClose: () => void
  onCompleted: () => void
}) {
  const [decision, setDecision] = useState<'kept' | 'modified' | 'removed' | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleSubmit = async () => {
    if (!decision || submitting) return
    setSubmitting(true)

    try {
      const supabase = createClient()

      // 1. Record the review
      await supabase.from('project_team_access_reviews').insert({
        project_id: projectId,
        member_id: member.id,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        decision,
        notes: notes.trim() || null,
      })

      // 2. Update member's last_reviewed_at
      await supabase
        .from('project_members')
        .update({ last_reviewed_at: new Date().toISOString() })
        .eq('id', member.id)

      // 3. Log activity
      await supabase.rpc('log_team_activity', {
        p_project_id: projectId,
        p_actor_id: (await supabase.auth.getUser()).data.user?.id,
        p_subject_member_id: member.id,
        p_event_type: 'access_reviewed',
        p_title: `Access reviewed for ${member.user?.full_name}`,
        p_summary: `Decision: ${decision}`,
        p_metadata: { decision, notes: notes.trim() }
      })

      toast.success('Access review completed')
      onCompleted()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save review')
      setSubmitting(false)
    }
  }

  const decisions = [
    {
      id: 'kept',
      label: 'Keep Current Access',
      desc: 'This member\'s permissions are appropriate for their role.',
      color: 'border-emerald-500/30 bg-emerald-500/5',
      activeColor: 'border-emerald-500/50 bg-emerald-500/10',
    },
    {
      id: 'modified',
      label: 'Modify Access',
      desc: 'Permissions need adjustment. Update their role template after this review.',
      color: 'border-amber-500/30 bg-amber-500/5',
      activeColor: 'border-amber-500/50 bg-amber-500/10',
    },
    {
      id: 'removed',
      label: 'Revoke Access',
      desc: 'This member should no longer have project access. Initiate offboarding.',
      color: 'border-red-500/30 bg-red-500/5',
      activeColor: 'border-red-500/50 bg-red-500/10',
    },
  ] as const

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-[#0d0d10] border border-white/[0.08] w-full max-w-[520px] md:rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <DsrtAvatar src={member.user?.avatar_url} name={member.user?.full_name || '?'} size="lg" />
            <div>
              <h3 className="text-[16px] font-bold text-white">{member.user?.full_name}</h3>
              <p className="text-[12px] text-white/50">{member.role || 'Member'} · {member.department || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/50 mb-3">
              Review Decision
            </h4>
            <div className="space-y-2">
              {decisions.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDecision(d.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3",
                    decision === d.id ? d.activeColor : d.color + ' hover:opacity-80'
                  )}
                >
                  <div>
                    <p className="text-[14px] font-bold text-white mb-0.5">{d.label}</p>
                    <p className="text-[12px] text-white/50 leading-snug">{d.desc}</p>
                  </div>
                  {decision === d.id && <CheckCircle size={18} weight="fill" className="text-white shrink-0 mt-1" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/50 mb-1.5 block">
              Notes <span className="text-white/30 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this review..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl p-3.5 text-[13.5px] text-white outline-none focus:border-white/[0.2] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} disabled={submitting} className="px-4 h-10 text-[13px] font-semibold text-white/60 hover:text-white border border-white/[0.1] rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || submitting}
            className={cn(
              "px-5 h-10 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-all",
              decision && !submitting
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/[0.04] text-white/30 cursor-not-allowed"
            )}
          >
            {submitting ? (
              <><CircleNotch size={14} className="animate-spin" /> Saving...</>
            ) : (
              <><Check size={14} weight="bold" /> Complete Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function SummaryCell({
  label, value, loading, highlight, highlightColor,
}: {
  label: string
  value: number
  loading: boolean
  highlight?: boolean
  highlightColor?: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-[#0a0a0f]">
      <span className={cn(
        "text-[16px] font-bold tabular-nums w-6",
        highlight && highlightColor ? highlightColor : "text-white"
      )}>
        {loading ? '-' : value}
      </span>
      <span className="text-[12.5px] font-semibold text-white/50">{label}</span>
    </div>
  )
}