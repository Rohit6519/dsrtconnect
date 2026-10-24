'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, Check, CaretDown, WarningCircle, CircleNotch, Info, Sliders, Layout
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { InviteDraftState } from './TeamAddMemberComposer'
import type { AccessPermissions } from '@/types/team'

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

interface RolePreset {
  id: string
  key: string
  label: string
  description: string
  is_leadership: boolean
  default_permissions: AccessPermissions
}

// ═══════════════════════════════════════════════════════════════════════════
// UI CONFIG FOR PERMISSION MATRIX
// ═══════════════════════════════════════════════════════════════════════════

const MATRIX_CONFIG = [
  {
    category: 'project', label: 'Project Detail',
    flags: [
      { key: 'view', label: 'View details' },
      { key: 'edit', label: 'Edit settings & profile' },
      { key: 'delete', label: 'Archive project', danger: true },
    ]
  },
  {
    category: 'team', label: 'Team & Graph',
    flags: [
      { key: 'view', label: 'View team & graph' },
      { key: 'invite', label: 'Invite members' },
      { key: 'remove', label: 'Remove members', danger: true },
      { key: 'manage_permissions', label: 'Manage access', danger: true },
    ]
  },
  {
    category: 'projects', label: 'Child Projects',
    flags: [
      { key: 'view', label: 'View child projects' },
      { key: 'create', label: 'Create new projects' },
      { key: 'edit', label: 'Edit child projects' },
      { key: 'archive', label: 'Archive child projects', danger: true },
    ]
  },
  {
    category: 'research', label: 'Research & IP',
    flags: [
      { key: 'view', label: 'View research' },
      { key: 'create', label: 'Add research items' },
      { key: 'edit', label: 'Edit research/IP' },
    ]
  },
  {
    category: 'financial', label: 'Financials',
    flags: [
      { key: 'view', label: 'View financial data' },
      { key: 'manage', label: 'Manage transactions', danger: true },
    ]
  },
  {
    category: 'mail', label: 'DSRT Mail',
    flags: [
      { key: 'use', label: 'Use project email' },
      { key: 'team_comm', label: 'Team communication' },
    ]
  },
  {
    category: 'analytics', label: 'Analytics',
    flags: [
      { key: 'view', label: 'View metrics' },
      { key: 'export', label: 'Export data' },
    ]
  },
] as const

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Step5Access({ projectId, draft, updateDraft, onPrev, onNext }: Props) {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic')
  
  const [presets, setPresets] = useState<RolePreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [activePresetKey, setActivePresetKey] = useState<string>('contributor')
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false)

  const isMountedRef = useRef(true)

  // ─── Fetch Presets ───────────────────────────────────────────────────
  const fetchPresets = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('project_team_role_definitions')
        .select('*')
        .or(`project_id.eq.${projectId},is_system.eq.true`)
        .order('is_system', { ascending: false }) // System roles first
        .order('label')

      if (error) throw error
      if (isMountedRef.current && data) {
        setPresets(data as RolePreset[])
      }
    } catch (e: any) {
      console.error('[Step5Access] Error loading presets:', e)
      if (isMountedRef.current) setError('Failed to load role templates')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    isMountedRef.current = true
    fetchPresets()
    return () => { isMountedRef.current = false }
  }, [fetchPresets])

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleApplyPreset = (presetKey: string) => {
    const preset = presets.find(p => p.key === presetKey)
    if (!preset) return
    
    setActivePresetKey(presetKey)
    setPresetDropdownOpen(false)
    
    // Hard override of the draft permissions with the preset's defaults
    updateDraft({ permissions: preset.default_permissions })
    
    // If they picked a leadership role, auto-toggle the lead flag
    if (preset.is_leadership) {
      updateDraft({ isLead: true })
    }
  }

  const togglePermission = (category: keyof AccessPermissions, flag: string) => {
    // If they modify a specific flag, switch them implicitly to advanced mode (or custom preset behavior)
    setMode('advanced')
    
    const catState = draft.permissions[category] || {}
    const currentState = !!(catState as any)[flag]
    
    const nextPerms = {
      ...draft.permissions,
      [category]: {
        ...catState,
        [flag]: !currentState
      }
    }
    
    updateDraft({ permissions: nextPerms })
  }

  const activePreset = presets.find(p => p.key === activePresetKey)

  return (
    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">
            Access Matrix
          </h1>
          <p className="text-[14.5px] text-white/50">
            What level of authority and visibility should they have?
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl shrink-0">
          <button
            onClick={() => setMode('basic')}
            className={cn(
              'px-4 h-8 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5',
              mode === 'basic' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'
            )}
          >
            <Layout size={14} weight={mode === 'basic' ? 'fill' : 'regular'} /> Basic
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={cn(
              'px-4 h-8 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1.5',
              mode === 'advanced' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-white/40 hover:text-white/70'
            )}
          >
            <Sliders size={14} weight={mode === 'advanced' ? 'fill' : 'regular'} /> Advanced
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto pb-8 scrollbar-hide">
        
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <CircleNotch size={24} className="animate-spin text-white/30" />
            <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">
              Loading permissions...
            </span>
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <WarningCircle size={20} weight="fill" className="text-red-400" />
            <span className="text-[13px] text-red-300 font-semibold">{error}</span>
            <button onClick={fetchPresets} className="text-[12px] text-white/50 hover:text-white underline mt-2">Retry</button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Preset Selector (Always visible but styled differently based on mode) */}
            <div className={cn(
              "bg-[#121215] border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 relative",
              mode === 'basic' ? "ring-1 ring-[#38bdf8]/30 shadow-[0_0_20px_rgba(56,189,248,0.05)]" : "opacity-60 grayscale-[0.3]"
            )}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <label className="text-[13px] font-bold text-white block mb-1">
                    Permission Template
                  </label>
                  <p className="text-[12px] text-white/50">
                    Apply a predefined set of permissions.
                  </p>
                </div>
                {mode === 'advanced' && (
                  <button onClick={() => setMode('basic')} className="text-[11px] font-semibold text-[#38bdf8] hover:text-white bg-[#38bdf8]/10 px-2 py-1 rounded">
                    Return to Basic
                  </button>
                )}
              </div>

              <button
                onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                className="w-full flex items-center justify-between h-12 px-4 bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2] rounded-xl transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} weight="fill" className={activePreset?.is_leadership ? "text-purple-400" : "text-[#38bdf8]"} />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-white leading-tight">
                      {activePreset?.label || 'Select a template'}
                    </span>
                  </div>
                </div>
                <CaretDown size={16} weight="bold" className="text-white/40 shrink-0" />
              </button>

              {activePreset && (
                <div className="mt-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg flex items-start gap-2.5">
                  <Info size={16} weight="fill" className="text-white/30 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-white/60 leading-snug">
                    {activePreset.description}
                  </p>
                </div>
              )}

              {presetDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPresetDropdownOpen(false)} />
                  <div className="absolute z-20 top-[90px] left-6 right-6 bg-[#0a0a0f] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                    {presets.map(p => (
                      <button
                        key={p.key}
                        onClick={() => handleApplyPreset(p.key)}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3",
                          activePresetKey === p.key ? "bg-[#38bdf8]/10" : "hover:bg-white/[0.04]"
                        )}
                      >
                        <ShieldCheck size={16} weight="fill" className={cn("mt-0.5 shrink-0", p.is_leadership ? "text-purple-400" : "text-white/40", activePresetKey === p.key && "text-[#38bdf8]")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn("text-[13px] font-bold", activePresetKey === p.key ? "text-[#38bdf8]" : "text-white")}>
                              {p.label}
                            </span>
                            {p.is_leadership && <span className="text-[9px] font-mono uppercase tracking-wider text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">Leader</span>}
                          </div>
                          <p className="text-[11px] text-white/45 truncate">{p.description}</p>
                        </div>
                        {activePresetKey === p.key && <Check size={16} weight="bold" className="text-[#38bdf8] shrink-0 self-center" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 2. Granular Matrix (Advanced Mode Only) */}
            {mode === 'advanced' && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-400 space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Sliders size={16} className="text-[#38bdf8]" />
                  <h3 className="text-[13.5px] font-bold text-white">Granular Permissions</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MATRIX_CONFIG.map(group => {
                    const groupState = draft.permissions[group.category as keyof AccessPermissions] || {}

                    return (
                      <div key={group.category} className="bg-[#121215] border border-white/[0.06] rounded-xl p-5">
                        <h4 className="text-[11px] font-mono uppercase tracking-widest text-white/40 font-bold mb-4">
                          {group.label}
                        </h4>
                        <div className="space-y-3">
                          {group.flags.map(flag => {
                            const isChecked = !!(groupState as any)[flag.key]
                            
                            return (
                              <label key={flag.key} className="flex items-start gap-3 cursor-pointer group/toggle">
                                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(group.category as keyof AccessPermissions, flag.key)}
                                    className={cn(
                                      "peer appearance-none w-4 h-4 border-2 rounded transition-all cursor-pointer",
                                      flag.danger 
                                        ? "border-red-500/40 bg-white/[0.02] checked:bg-red-500 checked:border-red-500" 
                                        : "border-white/20 bg-white/[0.02] checked:bg-[#38bdf8] checked:border-[#38bdf8]"
                                    )}
                                  />
                                  <Check size={10} weight="bold" className="absolute text-[#05070D] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                </div>
                                <span className={cn(
                                  "text-[13px] font-medium leading-snug pt-[1px] transition-colors",
                                  isChecked ? "text-white" : "text-white/60 group-hover/toggle:text-white/80",
                                  flag.danger && isChecked && "text-red-300"
                                )}>
                                  {flag.label}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
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
          className="h-11 px-6 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-white/90 transition-transform active:scale-95"
        >
          Next: Review
        </button>
      </div>
    </div>
  )
}