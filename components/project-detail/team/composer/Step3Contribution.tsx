'use client'

import { useState } from 'react'
import {
  Sparkle, Code, ListChecks, Plus, Trash, X, Info
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { InviteDraftState } from './TeamAddMemberComposer'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  draft: InviteDraftState
  updateDraft: (p: Partial<InviteDraftState>) => void
  onPrev: () => void
  onNext: () => void
}

const COMMON_SKILLS = [
  'Python', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 
  'Docker', 'Figma', 'UI/UX', 'Product Management', 'Marketing', 'Sales'
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Step3Contribution({ draft, updateDraft, onPrev, onNext }: Props) {
  const [skillInput, setSkillInput] = useState('')

  // ─── Handlers ────────────────────────────────────────────────────────
  
  const handleAddResponsibility = () => {
    if (draft.responsibilities.length >= 10) return
    updateDraft({ responsibilities: [...draft.responsibilities, ''] })
  }

  const handleUpdateResponsibility = (index: number, val: string) => {
    const next = [...draft.responsibilities]
    next[index] = val
    updateDraft({ responsibilities: next })
  }

  const handleRemoveResponsibility = (index: number) => {
    updateDraft({ responsibilities: draft.responsibilities.filter((_, i) => i !== index) })
  }

  const handleAddSkill = (skill: string) => {
    const val = skill.trim()
    if (!val || draft.skills.includes(val) || draft.skills.length >= 10) return
    updateDraft({ skills: [...draft.skills, val] })
    setSkillInput('')
  }

  const handleRemoveSkill = (skill: string) => {
    updateDraft({ skills: draft.skills.filter(s => s !== skill) })
  }

  // Ensure there's always at least one empty responsibility input if none exist
  if (draft.responsibilities.length === 0) {
    updateDraft({ responsibilities: [''] })
  }

  const validResponsibilities = draft.responsibilities.filter(r => r.trim().length > 0)
  const canProceed = draft.primaryContribution.trim().length >= 3 && validResponsibilities.length > 0

  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
          Contribution Profile
        </h1>
        <p className="text-[14.5px] text-white/50">
          What will this person actually do? Define their focus and specific duties.
        </p>
      </div>

      <div className="flex-1 flex flex-col space-y-8 overflow-y-auto pb-8 scrollbar-hide">
        
        {/* 1. Primary Contribution */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Sparkle size={14} weight="fill" /> Core Focus
          </h3>
          <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6">
            <label className="text-[12px] font-semibold text-white/80 block mb-2">
              Primary Contribution *
            </label>
            <input
              autoFocus
              value={draft.primaryContribution}
              onChange={e => updateDraft({ primaryContribution: e.target.value.slice(0, 100) })}
              placeholder="e.g. Backend architecture & API development"
              className="w-full h-12 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[14.5px] text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all"
            />
            <p className="text-[11.5px] text-white/40 mt-2.5 flex items-start gap-1.5 leading-snug">
              <Info size={14} weight="fill" className="text-[#38bdf8] shrink-0" />
              This appears directly under their name on the team roster so everyone knows their main function.
            </p>
          </div>
        </div>

        {/* 2. Specific Responsibilities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <ListChecks size={14} weight="fill" /> Responsibilities *
            </h3>
            <span className="text-[11px] text-white/30 font-mono">
              {validResponsibilities.length}/10 max
            </span>
          </div>
          
          <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6 space-y-3">
            {draft.responsibilities.map((resp, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-6 h-11 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <input
                  value={resp}
                  onChange={e => handleUpdateResponsibility(i, e.target.value)}
                  placeholder="e.g. Maintain Kubernetes clusters"
                  className="flex-1 h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all"
                />
                {draft.responsibilities.length > 1 && (
                  <button
                    onClick={() => handleRemoveResponsibility(i)}
                    className="w-11 h-11 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                    aria-label="Remove"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </div>
            ))}

            {draft.responsibilities.length < 10 && (
              <div className="pt-2 pl-8">
                <button
                  onClick={handleAddResponsibility}
                  className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/50 hover:text-white transition-colors"
                >
                  <Plus size={12} weight="bold" /> Add responsibility
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. Skills */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Code size={14} weight="fill" /> Skills required
            </h3>
            <span className="text-[11px] text-white/30 font-mono">
              Optional · {draft.skills.length}/10 max
            </span>
          </div>

          <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {draft.skills.map(skill => (
                <span 
                  key={skill} 
                  className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.12] rounded-lg pl-3 pr-2 py-1.5 text-[12.5px] font-medium text-white"
                >
                  {skill}
                  <button 
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-white/40 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded p-0.5 transition-colors"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </span>
              ))}
            </div>

            {draft.skills.length < 10 && (
              <div className="relative">
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      handleAddSkill(skillInput)
                    }
                  }}
                  placeholder="Type a skill and press Enter..."
                  className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all"
                />
                
                {/* Suggestions */}
                {skillInput.length === 0 && draft.skills.length === 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_SKILLS.map(s => (
                        <button
                          key={s}
                          onClick={() => handleAddSkill(s)}
                          className="px-2.5 py-1 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-md text-[11.5px] text-white/60 hover:text-white transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

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
          disabled={!canProceed}
          className={cn(
            "h-11 px-6 rounded-xl font-bold text-[14px] transition-transform active:scale-95",
            canProceed
              ? "bg-white text-black hover:bg-white/90"
              : "bg-white/[0.04] text-white/30 cursor-not-allowed"
          )}
        >
          Next: Work Plan
        </button>
      </div>
    </div>
  )
}