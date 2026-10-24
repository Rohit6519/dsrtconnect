'use client'

import { useState, useMemo } from 'react'
import {
  PaperPlaneTilt, ArrowRight, CircleNotch, CheckCircle, WarningCircle,
  User, Briefcase, Code, Target, ShieldCheck, Calendar, Clock,
  TreeStructure, Medal, EnvelopeSimple, Info
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DsrtAvatar, DsrtPanel } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { InviteDraftState } from './TeamAddMemberComposer'
import type { AccessPermissions } from '@/types/team'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  slug: string
  projectId: string
  draft: InviteDraftState
  onPrev: () => void
  onClose: () => void
  onSuccess?: () => void
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:      { label: 'Low',      color: 'text-zinc-400' },
  normal:   { label: 'Normal',   color: 'text-blue-400' },
  high:     { label: 'High',     color: 'text-orange-400' },
  critical: { label: 'Critical', color: 'text-red-400' },
}

const WORKING_MODEL_LABELS: Record<string, string> = {
  flexible:      'Flexible',
  part_time:     'Part-time',
  full_time:     'Full-time',
  project_based: 'Project-based',
}

const SENIORITY_LABELS: Record<string, string> = {
  intern: 'Intern', junior: 'Junior', mid: 'Mid-Level', senior: 'Senior',
  lead: 'Lead', principal: 'Principal', staff: 'Staff', executive: 'Executive', advisor: 'Advisor',
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

/** Count how many permissions are granted across all domains */
function countPermissions(perms: AccessPermissions): { granted: number; total: number } {
  let granted = 0
  let total = 0
  for (const cat of Object.values(perms)) {
    if (!cat || typeof cat !== 'object') continue
    for (const val of Object.values(cat)) {
      total++
      if (val) granted++
    }
  }
  return { granted, total }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Step6Review({ slug, projectId, draft, onPrev, onClose, onSuccess }: Props) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personalMessage, setPersonalMessage] = useState('')

  // ─── Derived ─────────────────────────────────────────────────────────
  const recipientName = draft.selectedUser?.full_name || draft.email || 'Invitee'
  const recipientUsername = draft.selectedUser?.username
  const recipientAvatar = draft.selectedUser?.avatar_url
  const recipientEmail = draft.selectedUser?.email || draft.email

  const validResponsibilities = draft.responsibilities.filter(r => r.trim().length > 0)
  const validObjectives = draft.objectives.filter(o => o.title.trim().length > 0)
  const permissionCounts = useMemo(() => countPermissions(draft.permissions), [draft.permissions])

  // ─── Submit ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (sending || sent) return
    setSending(true)
    setError(null)

    try {
      const payload = {
        // Recipient
        invited_user_id: draft.selectedUser?.id || null,
        invited_email: draft.email || null,
        invited_name: draft.selectedUser?.full_name || null,
        personal_message: personalMessage.trim() || null,

        // Snapshot
        snapshot: {
          role_label: draft.roleTitle,
          department_name: draft.department || null,
          seniority: draft.seniority || null,
          reports_to_member_id: draft.reportsToId || null,
          is_lead: draft.isLead,
          permissions: draft.permissions,
          primary_contribution: draft.primaryContribution,
          skills: draft.skills,
          responsibilities: validResponsibilities.map((r, i) => ({
            id: null,
            title: r,
            is_primary: i === 0,
          })),
          work_plan: {
            start_date: draft.startDate || null,
            commitment_hours: draft.commitmentHours,
            working_model: draft.workingModel || null,
            timezone: null,
            objectives: validObjectives.map(o => ({
              title: o.title,
              priority: o.priority,
              due_date: o.dueDate,
            })),
          },
        },

        // Meta
        role_title: draft.roleTitle,
        department: draft.department,
        seniority: draft.seniority,
        reports_to_id: draft.reportsToId,
        is_lead: draft.isLead,
        working_model: draft.workingModel,
        commitment_hours: draft.commitmentHours,
        start_date: draft.startDate,
        responsibilities: validResponsibilities,
        skills: draft.skills,
        objectives: validObjectives,
        permissions: draft.permissions,
      }

      const res = await fetch(`/api/projects/${slug}/team/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Failed to send invitation (${res.status})`)

      setSent(true)
      toast.success('Invitation sent successfully')

      // Auto-close after success display
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2500)
    } catch (e: any) {
      setError(e?.message || 'Failed to send invitation')
      toast.error(e?.message || 'Invitation failed')
    } finally {
      setSending(false)
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // SUCCESS STATE
  // ═════════════════════════════════════════════════════════════════════
  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 py-20">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
          <CheckCircle size={40} weight="fill" className="text-emerald-400" />
        </div>
        <h2 className="text-[24px] font-extrabold text-white mb-2">Invitation Sent</h2>
        <p className="text-[14.5px] text-white/60 max-w-md leading-relaxed mb-2">
          {recipientName} will receive a DSRT invitation to review the role, responsibilities, work plan, and access before accepting.
        </p>
        <p className="text-[12px] text-white/40 font-mono">Closing automatically...</p>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════
  // REVIEW STATE
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
          Review & Send
        </h1>
        <p className="text-[14.5px] text-white/50">
          This is exactly what the recipient will see before accepting.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide space-y-6">

        {/* ─── RECIPIENT CARD ──────────────────────────────────────────── */}
        <DsrtPanel padding="none" variant="default" className="overflow-hidden">
          <div className="p-6 flex items-center gap-4">
            <DsrtAvatar src={recipientAvatar} name={recipientName} size="lg" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[18px] font-extrabold text-white truncate">{recipientName}</h3>
              {recipientUsername && (
                <p className="text-[12.5px] font-mono text-white/40">@{recipientUsername}</p>
              )}
              {recipientEmail && !recipientUsername && (
                <p className="text-[12.5px] font-mono text-white/40">{recipientEmail}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-1">Invited as</p>
              <p className="text-[15px] font-bold text-white">{draft.roleTitle || 'Team Member'}</p>
            </div>
          </div>
        </DsrtPanel>

        {/* ─── ROLE & PLACEMENT ────────────────────────────────────────── */}
        <ReviewSection
          icon={<Briefcase size={15} weight="fill" className="text-white/40" />}
          title="Role & Placement"
        >
          <ReviewRow label="Title" value={draft.roleTitle} />
          <ReviewRow label="Department" value={draft.department || '—'} />
          <ReviewRow label="Seniority" value={draft.seniority ? SENIORITY_LABELS[draft.seniority] || draft.seniority : '—'} />
          <ReviewRow label="Leadership" value={draft.isLead ? 'Yes — Team Lead' : 'No'} />
        </ReviewSection>

        {/* ─── CONTRIBUTION ────────────────────────────────────────────── */}
        <ReviewSection
          icon={<Code size={15} weight="fill" className="text-white/40" />}
          title="Contribution"
        >
          <ReviewRow label="Primary focus" value={draft.primaryContribution || '—'} />

          {validResponsibilities.length > 0 && (
            <div className="pt-3 mt-3 border-t border-white/[0.04]">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-2">
                Responsibilities ({validResponsibilities.length})
              </p>
              <ol className="space-y-1.5">
                {validResponsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-white/80">
                    <span className="text-[11px] font-mono text-white/30 mt-[2px] shrink-0 w-5 text-right">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{r}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {draft.skills.length > 0 && (
            <div className="pt-3 mt-3 border-t border-white/[0.04]">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-2">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.skills.map(s => (
                  <span key={s} className="text-[12px] font-medium text-white/70 bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 rounded-md">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ReviewSection>

        {/* ─── WORK PLAN ──────────────────────────────────────────────── */}
        <ReviewSection
          icon={<Target size={15} weight="fill" className="text-white/40" />}
          title="Work Plan"
        >
          <ReviewRow label="Start date" value={formatDate(draft.startDate)} />
          <ReviewRow label="Commitment" value={draft.commitmentHours ? `${draft.commitmentHours} hrs / week` : 'Not specified'} />
          <ReviewRow label="Working model" value={WORKING_MODEL_LABELS[draft.workingModel] || draft.workingModel || '—'} />

          {validObjectives.length > 0 && (
            <div className="pt-3 mt-3 border-t border-white/[0.04]">
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-white/40 mb-3">
                Initial Objectives ({validObjectives.length})
              </p>
              <div className="space-y-3">
                {validObjectives.map((o, i) => {
                  const pri = PRIORITY_LABELS[o.priority] || PRIORITY_LABELS.normal
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                      <div className="w-6 h-6 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[11px] font-mono font-bold text-white/50">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-white leading-snug">{o.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11.5px]">
                          <span className={cn('font-bold uppercase tracking-wider', pri.color)}>
                            {pri.label}
                          </span>
                          {o.dueDate && (
                            <span className="text-white/40 flex items-center gap-1">
                              <Calendar size={11} weight="fill" /> {formatDate(o.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ReviewSection>

        {/* ─── ACCESS ──────────────────────────────────────────────────── */}
        <ReviewSection
          icon={<ShieldCheck size={15} weight="fill" className="text-white/40" />}
          title="Access"
        >
          <ReviewRow
            label="Permissions granted"
            value={`${permissionCounts.granted} of ${permissionCounts.total}`}
          />
          <div className="pt-3 mt-3 border-t border-white/[0.04]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {Object.entries(draft.permissions).map(([domain, flags]) => {
                if (!flags || typeof flags !== 'object') return null
                const grantedFlags = Object.entries(flags).filter(([_, v]) => v).map(([k]) => k)
                if (grantedFlags.length === 0) return null

                return (
                  <div key={domain} className="mb-2">
                    <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-1 capitalize">
                      {domain}
                    </p>
                    <div className="space-y-0.5">
                      {grantedFlags.map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <CheckCircle size={11} weight="fill" className="text-emerald-400 shrink-0" />
                          <span className="text-[12px] text-white/70 capitalize">
                            {f.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </ReviewSection>

        {/* ─── PERSONAL MESSAGE ────────────────────────────────────────── */}
        <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <EnvelopeSimple size={15} weight="fill" className="text-white/40" />
            <h3 className="text-[13px] font-bold text-white">Personal Message</h3>
            <span className="text-[10px] text-white/30 font-mono ml-auto">Optional</span>
          </div>
          <textarea
            value={personalMessage}
            onChange={e => setPersonalMessage(e.target.value.slice(0, 500))}
            placeholder="Add a personal note to the invitation..."
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl p-3.5 text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] resize-none transition-all"
          />
          {personalMessage.length > 0 && (
            <p className="text-[10.5px] text-white/30 font-mono mt-1.5 text-right">
              {personalMessage.length}/500
            </p>
          )}
        </div>

        {/* ─── NOTICE ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-[#38bdf8]/5 border border-[#38bdf8]/15 rounded-xl">
          <Info size={18} weight="fill" className="text-[#38bdf8] shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-[#bae6fd] leading-snug">
            The invited member will see this exact information before accepting. They can suggest changes to the work plan — you'll be notified and can approve or modify before work begins.
          </p>
        </div>

        {/* ─── ERROR ───────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/[0.08] border border-red-500/25 rounded-xl">
            <WarningCircle size={18} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium text-red-300 leading-snug">{error}</p>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-white/[0.06] flex items-center justify-between bg-[#0a0a0f] sticky bottom-0 z-10">
        <button
          onClick={onPrev}
          disabled={sending}
          className="h-11 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-[14px] transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className={cn(
            "h-12 px-8 rounded-xl font-extrabold text-[14.5px] flex items-center gap-2.5 transition-all active:scale-95 shadow-lg",
            sending
              ? "bg-white/[0.06] text-white/50 cursor-wait"
              : "bg-gradient-to-r from-[#38bdf8] to-[#2563eb] text-white hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]"
          )}
        >
          {sending ? (
            <><CircleNotch size={16} className="animate-spin" /> Sending invitation...</>
          ) : (
            <><PaperPlaneTilt size={16} weight="fill" /> Send Invitation</>
          )}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ReviewSection({
  icon, title, children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]">
        {icon}
        <h3 className="text-[13px] font-bold text-white tracking-tight">{title}</h3>
      </div>
      <div className="p-5 space-y-2">{children}</div>
    </DsrtPanel>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-[11.5px] font-mono uppercase tracking-wider text-white/45 shrink-0">
        {label}
      </span>
      <span className="text-[13.5px] font-semibold text-white text-right truncate max-w-[280px]">
        {value}
      </span>
    </div>
  )
}