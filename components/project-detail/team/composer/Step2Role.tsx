'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Briefcase, Buildings, TreeStructure, Medal, Check, CaretDown, Plus, CircleNotch
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { DsrtAvatar } from '@/components/dsrt'
import type { InviteDraftState } from './TeamAddMemberComposer'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  draft: InviteDraftState
  updateDraft: (p: Partial<InviteDraftState>) => void
  onPrev: () => void
  onNext: () => void
}

const SENIORITY_LEVELS = [
  { id: 'intern', label: 'Intern' },
  { id: 'junior', label: 'Junior' },
  { id: 'mid', label: 'Mid-Level' },
  { id: 'senior', label: 'Senior' },
  { id: 'lead', label: 'Lead' },
  { id: 'principal', label: 'Principal' },
  { id: 'staff', label: 'Staff' },
  { id: 'executive', label: 'Executive' },
  { id: 'advisor', label: 'Advisor' },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Step2Role({ projectId, draft, updateDraft, onPrev, onNext }: Props) {
  // ─── Data ────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Dropdown UI State ───────────────────────────────────────────────
  const [deptOpen, setDeptOpen] = useState(false)
  const [seniorityOpen, setSeniorityOpen] = useState(false)
  const [reportsToOpen, setReportsToOpen] = useState(false)

  // ─── Custom Department State ─────────────────────────────────────────
  const [newDeptInput, setNewDeptInput] = useState('')

  const isMountedRef = useRef(true)

  // ─── Fetch context ───────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch departments
      const { data: depts } = await supabase
        .from('project_team_departments')
        .select('name')
        .eq('project_id', projectId)
        .order('sort_order')

      // Fetch team members (for "Reports to")
      const { data: members } = await supabase.rpc('list_project_team_members', {
        p_project_id: projectId,
        p_include_removed: false,
      })

      if (!isMountedRef.current) return

      if (depts) {
        setDepartments(depts.map(d => d.name))
      }
      if (members) {
        // Filter out the person being invited (if they somehow exist)
        const validMembers = (members as any[]).filter(m => 
          m.user_id !== draft.selectedUser?.id
        )
        setTeamMembers(validMembers)
      }
    } catch (e) {
      console.error('[Step2Role] Fetch error:', e)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId, draft.selectedUser?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleAddNewDept = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return
    e.preventDefault()
    
    const val = newDeptInput.trim()
    if (!val) return
    
    // Add locally (will be saved to DB when invitation is sent)
    if (!departments.includes(val)) {
      setDepartments(prev => [...prev, val].sort())
    }
    updateDraft({ department: val })
    setNewDeptInput('')
    setDeptOpen(false)
  }

  const reportsToMember = teamMembers.find(m => m.id === draft.reportsToId)
  const canProceed = draft.roleTitle.trim().length >= 2 && draft.department.trim().length > 0

  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
          Define their role
        </h1>
        <p className="text-[14.5px] text-white/50">
          Set their title, placement in the organization, and leadership responsibilities.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <CircleNotch size={24} className="animate-spin text-white/30" />
          <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">
            Loading team structure...
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-8 overflow-y-auto pb-8 scrollbar-hide">
          
          {/* 1. Primary Role */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Briefcase size={14} weight="fill" /> Primary Role
            </h3>
            <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6">
              <label className="text-[12px] font-semibold text-white/80 block mb-2">
                Job Title *
              </label>
              <input
                autoFocus
                value={draft.roleTitle}
                onChange={e => updateDraft({ roleTitle: e.target.value.slice(0, 100) })}
                placeholder="e.g. Backend Engineering Lead"
                className="w-full h-12 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[15px] font-semibold text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all"
              />
            </div>
          </div>

          {/* 2. Organizational Placement */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <TreeStructure size={14} weight="fill" /> Placement
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Department Dropdown */}
              <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-5 relative">
                <label className="text-[12px] font-semibold text-white/80 block mb-2">
                  Department *
                </label>
                <button
                  onClick={() => { setDeptOpen(!deptOpen); setSeniorityOpen(false); setReportsToOpen(false) }}
                  className="w-full flex items-center justify-between h-11 px-4 bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] rounded-xl transition-colors text-left"
                >
                  <span className={cn("text-[14px] font-medium truncate", draft.department ? "text-white" : "text-white/30")}>
                    {draft.department || 'Select department'}
                  </span>
                  <CaretDown size={14} weight="bold" className="text-white/40 shrink-0" />
                </button>

                {deptOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDeptOpen(false)} />
                    <div className="absolute z-20 top-[90px] left-5 right-5 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <div className="max-h-[200px] overflow-y-auto space-y-0.5 mb-1.5 pb-1.5 border-b border-white/[0.06]">
                        {departments.length === 0 ? (
                          <div className="px-3 py-3 text-[12px] text-white/40 text-center">No departments yet</div>
                        ) : (
                          departments.map(d => (
                            <button
                              key={d}
                              onClick={() => { updateDraft({ department: d }); setDeptOpen(false) }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-between",
                                draft.department === d ? "bg-[#38bdf8]/10 text-[#38bdf8]" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                              )}
                            >
                              {d}
                              {draft.department === d && <Check size={14} weight="bold" />}
                            </button>
                          ))
                        )}
                      </div>
                      <div className="px-2 pb-1 pt-1 flex gap-2">
                        <input
                          value={newDeptInput}
                          onChange={e => setNewDeptInput(e.target.value)}
                          onKeyDown={handleAddNewDept}
                          placeholder="New department..."
                          className="flex-1 h-9 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 text-[12px] text-white outline-none focus:border-white/20"
                        />
                        <button
                          onClick={handleAddNewDept}
                          disabled={!newDeptInput.trim()}
                          className="h-9 px-3 bg-white text-black font-semibold rounded-md text-[12px] disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Seniority Dropdown */}
              <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-5 relative">
                <label className="text-[12px] font-semibold text-white/80 block mb-2 flex items-center justify-between">
                  <span>Seniority</span>
                  <span className="text-[10px] text-white/30 font-mono">Optional</span>
                </label>
                <button
                  onClick={() => { setSeniorityOpen(!seniorityOpen); setDeptOpen(false); setReportsToOpen(false) }}
                  className="w-full flex items-center justify-between h-11 px-4 bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] rounded-xl transition-colors text-left"
                >
                  <span className={cn("text-[14px] font-medium truncate capitalize", draft.seniority ? "text-white" : "text-white/30")}>
                    {SENIORITY_LEVELS.find(s => s.id === draft.seniority)?.label || 'Select seniority'}
                  </span>
                  <CaretDown size={14} weight="bold" className="text-white/40 shrink-0" />
                </button>

                {seniorityOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSeniorityOpen(false)} />
                    <div className="absolute z-20 top-[90px] left-5 right-5 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 max-h-[240px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                      <button
                        onClick={() => { updateDraft({ seniority: '' }); setSeniorityOpen(false) }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-white/40 hover:bg-white/[0.04] transition-colors"
                      >
                        None
                      </button>
                      {SENIORITY_LEVELS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { updateDraft({ seniority: s.id }); setSeniorityOpen(false) }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-between",
                            draft.seniority === s.id ? "bg-[#38bdf8]/10 text-[#38bdf8]" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                          )}
                        >
                          {s.label}
                          {draft.seniority === s.id && <Check size={14} weight="bold" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Reports To */}
            <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-5 relative">
              <label className="text-[12px] font-semibold text-white/80 block mb-2 flex items-center justify-between">
                <span>Reports to</span>
                <span className="text-[10px] text-white/30 font-mono">Optional</span>
              </label>
              <button
                onClick={() => { setReportsToOpen(!reportsToOpen); setDeptOpen(false); setSeniorityOpen(false) }}
                className="w-full flex items-center justify-between h-11 px-4 bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] rounded-xl transition-colors text-left"
              >
                {reportsToMember ? (
                  <div className="flex items-center gap-2">
                    <DsrtAvatar src={reportsToMember.user?.avatar_url} name={reportsToMember.user?.full_name || 'U'} size="xs" />
                    <span className="text-[14px] font-medium text-white truncate">
                      {reportsToMember.user?.full_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[14px] font-medium text-white/30">Select manager</span>
                )}
                <CaretDown size={14} weight="bold" className="text-white/40 shrink-0" />
              </button>

              {reportsToOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setReportsToOpen(false)} />
                  <div className="absolute z-20 top-[90px] left-5 right-5 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 max-h-[240px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                    <button
                      onClick={() => { updateDraft({ reportsToId: null }); setReportsToOpen(false) }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] text-white/40 hover:bg-white/[0.04] transition-colors"
                    >
                      No direct manager
                    </button>
                    {teamMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { updateDraft({ reportsToId: m.id }); setReportsToOpen(false) }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between",
                          draft.reportsToId === m.id ? "bg-[#38bdf8]/10" : "hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <DsrtAvatar src={m.user?.avatar_url} name={m.user?.full_name || 'U'} size="sm" />
                          <div className="flex flex-col">
                            <span className={cn("text-[13px] font-semibold", draft.reportsToId === m.id ? "text-[#38bdf8]" : "text-white")}>
                              {m.user?.full_name}
                            </span>
                            <span className="text-[10px] text-white/40">{m.role || 'Member'}</span>
                          </div>
                        </div>
                        {draft.reportsToId === m.id && <Check size={14} weight="bold" className="text-[#38bdf8]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. Leadership */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Medal size={14} weight="fill" /> Leadership
            </h3>
            
            <label className="flex items-start gap-4 bg-[#121215] hover:bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 cursor-pointer transition-colors group">
              <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={draft.isLead}
                  onChange={(e) => updateDraft({ isLead: e.target.checked })}
                  className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded bg-white/[0.02] checked:bg-[#38bdf8] checked:border-[#38bdf8] transition-all cursor-pointer"
                />
                <Check size={12} weight="bold" className="absolute text-[#05070D] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
              </div>
              <div className="flex-1">
                <p className="text-[14.5px] font-bold text-white mb-1">
                  Designate as Team Lead
                </p>
                <p className="text-[13px] text-white/50 leading-snug">
                  Highlights this person as a leader on the Team Graph. (Note: actual permissions are configured in Step 5).
                </p>
              </div>
            </label>
          </div>

        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-auto pt-6 border-t border-white/[0.06] flex items-center justify-between bg-[#0a0a0f] sticky bottom-0">
        <button
          onClick={onPrev}
          className="h-11 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-[14px] transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed || loading}
          className={cn(
            "h-11 px-6 rounded-xl font-bold text-[14px] transition-transform active:scale-95",
            canProceed && !loading
              ? "bg-white text-black hover:bg-white/90"
              : "bg-white/[0.04] text-white/30 cursor-not-allowed"
          )}
        >
          Next: Contribution
        </button>
      </div>
    </div>
  )
}