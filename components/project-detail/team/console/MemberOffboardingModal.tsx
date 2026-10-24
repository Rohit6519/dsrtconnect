'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  WarningCircle, UserMinus, X, CaretDown, Check,
  CircleNotch, Shuffle, Archive, ArrowRight, Kanban
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DsrtAvatar } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types/team'

interface Props {
  member: TeamMember
  slug: string
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

export function MemberOffboardingModal({ member, slug, projectId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activeObjectives, setActiveObjectives] = useState<any[]>([])
  
  // Form State
  const [reassignTo, setReassignTo] = useState<string | 'unassigned'>('unassigned')
  const [reason, setReason] = useState('')
  const [revokeAccess, setRevokeAccess] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      isMountedRef.current = false
      document.body.style.overflow = prev
    }
  }, [])

  // ─── Fetch active work & potential assignees ─────────────────────────
  const fetchData = useCallback(async () => {
    const supabase = createClient()
    try {
      const [objRes, teamRes] = await Promise.all([
        // Get their active work
        supabase
          .from('project_team_objectives')
          .select('id, title, status')
          .eq('owner_member_id', member.id)
          .in('status', ['assigned', 'in_progress', 'blocked', 'awaiting_review']),
        
        // Get other team members for reassignment
        supabase.rpc('list_project_team_members', {
          p_project_id: projectId,
          p_include_removed: false,
        })
      ])

      if (isMountedRef.current) {
        setActiveObjectives(objRes.data || [])
        setTeamMembers((teamRes.data as TeamMember[] || []).filter(m => m.id !== member.id))
      }
    } catch (e) {
      console.error('Failed to load offboarding context', e)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [member.id, projectId])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Submit Offboarding ──────────────────────────────────────────────
  const isConfirmed = confirmText.trim().toLowerCase() === 'remove'
  const canSubmit = !loading && !submitting && isConfirmed && reason.trim().length >= 5

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/projects/${slug}/team/members/${member.id}/offboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reassign_to_member_id: reassignTo === 'unassigned' ? null : reassignTo,
          revoke_access: revokeAccess,
          reason: reason.trim(),
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Offboarding failed')

      toast.success(`${member.user?.full_name || 'Member'} has been offboarded`)
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to complete offboarding')
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  // ─── RENDER ──────────────────────────────────────────────────────────
  const content = (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-[#0a0a0f] border border-red-500/25 w-full max-w-[560px] md:rounded-2xl overflow-hidden flex flex-col shadow-[0_0_80px_rgba(220,38,38,0.15)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-white/[0.06] bg-red-500/[0.03]">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
            <UserMinus size={18} weight="fill" className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-[16px] font-bold text-white leading-tight">
              Offboard Member
            </h3>
            <p className="text-[12.5px] text-white/50 mt-1 leading-snug">
              Securely remove <strong className="text-white/80">{member.user?.full_name}</strong> from the team while preserving their historical contributions.
            </p>
          </div>
          <button onClick={onClose} disabled={submitting} className="w-8 h-8 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <CircleNotch size={24} className="animate-spin text-white/30" />
            </div>
          ) : (
            <>
              {/* 1. Work Reassignment */}
              <div className="bg-[#121215] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Kanban size={16} weight="fill" className="text-white/40" />
                  <h4 className="text-[13.5px] font-bold text-white">Active Work</h4>
                </div>
                
                {activeObjectives.length > 0 ? (
                  <>
                    <p className="text-[12.5px] text-white/60 mb-4">
                      This member owns {activeObjectives.length} active objective{activeObjectives.length !== 1 ? 's' : ''}. Who should take over this work?
                    </p>
                    
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full flex items-center justify-between h-11 px-4 bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] rounded-xl transition-colors text-left"
                      >
                        {reassignTo === 'unassigned' ? (
                          <div className="flex items-center gap-2 text-white/60">
                            <Archive size={14} weight="fill" />
                            <span className="text-[13px] font-semibold">Leave unassigned</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <DsrtAvatar src={teamMembers.find(m => m.id === reassignTo)?.user?.avatar_url} name="A" size="xs" />
                            <span className="text-[13px] font-semibold text-white">
                              {teamMembers.find(m => m.id === reassignTo)?.user?.full_name}
                            </span>
                          </div>
                        )}
                        <CaretDown size={14} weight="bold" className="text-white/40" />
                      </button>

                      {dropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 max-h-[200px] overflow-y-auto">
                            <button
                              onClick={() => { setReassignTo('unassigned'); setDropdownOpen(false) }}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-semibold text-white/60 hover:bg-white/[0.04] flex items-center gap-2"
                            >
                              <Archive size={14} weight="fill" /> Leave unassigned
                              {reassignTo === 'unassigned' && <Check size={14} weight="bold" className="ml-auto text-[#38bdf8]" />}
                            </button>
                            <div className="h-px bg-white/[0.06] my-1 mx-2" />
                            {teamMembers.map(m => (
                              <button
                                key={m.id}
                                onClick={() => { setReassignTo(m.id); setDropdownOpen(false) }}
                                className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between hover:bg-white/[0.04]"
                              >
                                <div className="flex items-center gap-2">
                                  <DsrtAvatar src={m.user?.avatar_url} name={m.user?.full_name || '?'} size="xs" />
                                  <span className="text-[13px] font-semibold text-white">{m.user?.full_name}</span>
                                </div>
                                {reassignTo === m.id && <Check size={14} weight="bold" className="text-[#38bdf8]" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-[12.5px] text-white/40 italic">
                    This member has no active objectives to reassign.
                  </p>
                )}
              </div>

              {/* 2. Access Revocation */}
              <label className="flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors bg-red-500/[0.02] border-red-500/20 hover:bg-red-500/[0.05]">
                <div className="relative flex items-center justify-center w-[18px] h-[18px] shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={revokeAccess}
                    onChange={e => setRevokeAccess(e.target.checked)}
                    className="peer appearance-none w-[18px] h-[18px] border-2 rounded transition-all cursor-pointer border-red-500/40 bg-transparent checked:bg-red-500 checked:border-red-500"
                  />
                  <Check size={12} weight="bold" className="absolute text-[#05070D] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                </div>
                <div>
                  <p className="text-[13.5px] font-bold text-red-300">Revoke Project Access</p>
                  <p className="text-[12px] text-red-200/60 mt-1 leading-snug">
                    Immediately revokes all permissions. The user will no longer be able to view private project details, access the team graph, or contribute to objectives.
                  </p>
                </div>
              </label>

              {/* 3. Reason & Confirmation */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                    Reason for offboarding *
                  </label>
                  <input
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Contract ended, moving to new project..."
                    className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-lg px-4 text-[13.5px] text-white outline-none focus:border-red-400/50"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/50 mb-1.5 block">
                    Type <span className="text-red-400">REMOVE</span> to confirm
                  </label>
                  <input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="REMOVE"
                    className={cn(
                      "w-full h-11 bg-white/[0.03] border rounded-lg px-4 text-[13.5px] font-mono tracking-widest outline-none transition-colors",
                      isConfirmed ? "border-red-500 text-red-400 bg-red-500/10" : "border-white/[0.1] text-white focus:border-red-400/50"
                    )}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] bg-[#0a0a0f] px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 h-10 text-[13px] font-semibold text-white/60 hover:text-white border border-white/[0.1] hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "px-6 h-10 rounded-lg text-[13.5px] font-bold flex items-center gap-2 transition-all shadow-lg",
              canSubmit
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-white/[0.04] text-white/30 cursor-not-allowed"
            )}
          >
            {submitting ? (
              <><CircleNotch size={14} className="animate-spin" /> Processing</>
            ) : (
              <><UserMinus size={14} weight="bold" /> Remove Member</>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}