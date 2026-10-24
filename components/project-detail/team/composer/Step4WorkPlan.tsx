'use client'

import { useState } from 'react'
import {
  Calendar, Clock, Target, Plus, Trash, Info, Check, Watch
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

const WORKING_MODELS = [
  { id: 'flexible', label: 'Flexible', desc: 'Work whenever' },
  { id: 'part_time', label: 'Part-time', desc: 'Set hours/week' },
  { id: 'full_time', label: 'Full-time', desc: 'Core team member' },
  { id: 'project_based', label: 'Project-based', desc: 'Scope-defined' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  { id: 'normal', label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'high', label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { id: 'critical', label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Step4WorkPlan({ draft, updateDraft, onPrev, onNext }: Props) {
  
  // ─── Handlers ────────────────────────────────────────────────────────
  
  const handleAddObjective = () => {
    if (draft.objectives.length >= 5) return
    updateDraft({
      objectives: [
        ...draft.objectives,
        { title: '', priority: 'normal', dueDate: null }
      ]
    })
  }

  const handleUpdateObj = (index: number, patch: Partial<{ title: string; priority: string; dueDate: string | null }>) => {
    const next = [...draft.objectives]
    next[index] = { ...next[index], ...patch }
    updateDraft({ objectives: next })
  }

  const handleRemoveObj = (index: number) => {
    updateDraft({ objectives: draft.objectives.filter((_, i) => i !== index) })
  }

  // Ensure there's always at least one objective input if none exist
  if (draft.objectives.length === 0) {
    updateDraft({ objectives: [{ title: '', priority: 'normal', dueDate: null }] })
  }

  const validObjectives = draft.objectives.filter(o => o.title.trim().length > 0)
  
  // Requirement: at least 1 valid objective and a start date
  const canProceed = draft.startDate && validObjectives.length > 0

  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
          Work Plan
        </h1>
        <p className="text-[14.5px] text-white/50">
          Set expectations for time commitment and define initial objectives.
        </p>
      </div>

      <div className="flex-1 flex flex-col space-y-8 overflow-y-auto pb-8 scrollbar-hide">
        
        {/* 1. Commitment & Schedule */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
            <Clock size={14} weight="fill" /> Commitment
          </h3>
          
          <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6 space-y-6">
            
            {/* Working Model */}
            <div>
              <label className="text-[12px] font-semibold text-white/80 block mb-3">
                Working Model
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WORKING_MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => updateDraft({ workingModel: m.id })}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      draft.workingModel === m.id
                        ? "bg-[#38bdf8]/10 border-[#38bdf8]/40 shadow-sm"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-[13px] font-bold", draft.workingModel === m.id ? "text-white" : "text-white/70")}>
                        {m.label}
                      </span>
                      {draft.workingModel === m.id && <Check size={12} weight="bold" className="text-[#38bdf8]" />}
                    </div>
                    <span className="text-[11px] text-white/40">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Expected Hours */}
              <div>
                <label className="text-[12px] font-semibold text-white/80 flex items-center justify-between mb-2">
                  <span>Expected Hours / Week</span>
                  <span className="text-[10px] text-white/30 font-mono">Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={draft.commitmentHours === null ? '' : draft.commitmentHours}
                    onChange={e => {
                      const val = e.target.value
                      updateDraft({ commitmentHours: val === '' ? null : Math.max(0, parseInt(val) || 0) })
                    }}
                    placeholder="e.g. 10"
                    className="w-full h-11 pl-4 pr-12 bg-white/[0.03] border border-white/[0.1] rounded-xl text-[14.5px] font-semibold text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-medium text-white/40 pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[12px] font-semibold text-white/80 block mb-2">
                  Target Start Date *
                </label>
                <div className="relative">
                  <Calendar size={16} weight="fill" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={e => updateDraft({ startDate: e.target.value })}
                    className="w-full h-11 pl-11 pr-4 bg-white/[0.03] border border-white/[0.1] rounded-xl text-[14px] text-white outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Initial Objectives */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Target size={14} weight="fill" /> Initial Objectives *
            </h3>
            <span className="text-[11px] text-white/30 font-mono">
              {validObjectives.length}/5 max
            </span>
          </div>

          <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6">
            <div className="mb-5 p-3.5 bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-xl flex items-start gap-3">
              <Info size={16} weight="fill" className="text-[#38bdf8] shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-[#e0f2fe] leading-snug">
                Clear expectations are the foundation of great teamwork. 
                What exactly should this person accomplish in their first 30-90 days?
              </p>
            </div>

            <div className="space-y-4">
              {draft.objectives.map((obj, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl relative group">
                  
                  {/* Objective Title */}
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold mb-1.5 block">
                      Objective {i + 1}
                    </label>
                    <input
                      value={obj.title}
                      onChange={e => handleUpdateObj(i, { title: e.target.value.slice(0, 150) })}
                      placeholder="e.g. Build authentication API"
                      className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 text-[13.5px] font-semibold text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.06] transition-all"
                    />
                  </div>

                  <div className="flex items-end gap-3 w-full sm:w-auto">
                    {/* Priority */}
                    <div className="w-full sm:w-[130px]">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold mb-1.5 block">
                        Priority
                      </label>
                      <select
                        value={obj.priority}
                        onChange={e => handleUpdateObj(i, { priority: e.target.value })}
                        className={cn(
                          "w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 text-[12.5px] font-semibold outline-none cursor-pointer [color-scheme:dark]",
                          PRIORITIES.find(p => p.id === obj.priority)?.color || 'text-white'
                        )}
                      >
                        {PRIORITIES.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#12121a] text-white">
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Due Date */}
                    <div className="w-full sm:w-[140px]">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold mb-1.5 block">
                        Target Date
                      </label>
                      <div className="relative">
                        <Watch size={14} weight="fill" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                        <input
                          type="date"
                          value={obj.dueDate || ''}
                          onChange={e => handleUpdateObj(i, { dueDate: e.target.value || null })}
                          className="w-full h-10 pl-8 pr-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-[12px] text-white outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.06] transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  {draft.objectives.length > 1 && (
                    <button
                      onClick={() => handleRemoveObj(i)}
                      className="absolute -top-2 -right-2 sm:top-2 sm:right-2 w-7 h-7 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shadow-xl"
                      aria-label="Remove objective"
                    >
                      <Trash size={14} weight="bold" />
                    </button>
                  )}
                </div>
              ))}

              {draft.objectives.length < 5 && (
                <button
                  onClick={handleAddObjective}
                  className="w-full py-3.5 border border-dashed border-white/[0.15] hover:border-white/[0.3] rounded-xl text-[13px] font-semibold text-white/50 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} weight="bold" /> Add another objective
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="mt-auto pt-6 border-t border-white/[0.06] flex items-center justify-between bg-[#0a0a0f] sticky bottom-0 z-10">
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
          Next: Access
        </button>
      </div>
    </div>
  )
}