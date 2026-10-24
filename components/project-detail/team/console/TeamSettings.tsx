'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Gear, ShieldCheck, Users, EnvelopeSimple, Clock, Eye, Sliders,
  CircleNotch, WarningCircle, Check, FloppyDisk
} from '@phosphor-icons/react'
import { DsrtButton, DsrtPanel } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { TeamSettings as TeamSettingsType } from '@/types/team'

interface Props {
  projectId: string
  slug: string
  isOwner: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SETTINGS: Partial<TeamSettingsType> = {
  who_can_invite: 'owner',
  invitation_expiration_days: 14,
  require_work_plan_confirm: true,
  require_profile_completion: true,
  access_review_cadence_days: 90,
  team_visibility: 'project_visibility',
  custom_role_creation_allowed: true,
  auto_notify_workload_alerts: true,
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamSettings({ projectId, slug, isOwner }: Props) {
  const [settings, setSettings] = useState<Partial<TeamSettingsType>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchSettings = useCallback(async () => {
    if (!isOwner) {
      setLoading(false)
      setError('Only project owners can view team settings.')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data, error: dbErr } = await supabase
        .from('project_team_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()

      if (dbErr) throw dbErr
      
      if (isMountedRef.current) {
        if (data) {
          setSettings(data as TeamSettingsType)
        } else {
          // If no row exists yet, we'll use defaults and create it on first save
          setSettings(DEFAULT_SETTINGS)
        }
      }
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load settings')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId, isOwner])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    if (!isOwner) return
    setSaving(true)
    
    try {
      const supabase = createClient()
      const { error: upsertErr } = await supabase
        .from('project_team_settings')
        .upsert({
          project_id: projectId,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'project_id' })

      if (upsertErr) throw upsertErr
      
      toast.success('Team settings saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings')
    } finally {
      if (isMountedRef.current) setSaving(false)
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  if (!isOwner) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center border border-white/[0.04] bg-white/[0.01] rounded-3xl">
        <ShieldCheck size={40} weight="duotone" className="text-white/20 mb-4" />
        <p className="text-[15px] font-bold text-white mb-1">Access Restricted</p>
        <p className="text-[13px] text-white/50">Only the project owner can manage team settings.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <CircleNotch size={18} className="animate-spin text-white/30" />
        <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading settings...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
        <WarningCircle size={22} className="text-red-400" />
        <span className="text-[13px] text-red-300">{error}</span>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-4xl pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">Team Settings</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Configure onboarding rules, invitation policies, and team visibility.
          </p>
        </div>
        <DsrtButton
          variant="primary"
          size="sm"
          loading={saving}
          onClick={handleSave}
          className="bg-white text-black hover:bg-white/90 shadow-sm"
        >
          <FloppyDisk size={14} weight="bold" /> Save settings
        </DsrtButton>
      </div>

      <div className="space-y-6">

        {/* ─── MEMBERSHIP & INVITATIONS ──────────────────────────────────── */}
        <DsrtPanel padding="none" variant="default" className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
            <EnvelopeSimple size={16} weight="fill" className="text-white/40" />
            <h4 className="text-[14.5px] font-bold text-white tracking-tight">Membership & Invitations</h4>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="text-[12px] font-semibold text-white/80 block mb-2">
                Who can invite new members?
              </label>
              <select
                value={settings.who_can_invite}
                onChange={e => setSettings({ ...settings, who_can_invite: e.target.value as any })}
                className="w-full sm:w-80 h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[13px] font-medium text-white outline-none focus:border-[#38bdf8]/50 transition-colors [color-scheme:dark]"
              >
                <option value="owner" className="bg-[#12121a]">Only project owners</option>
                <option value="leads" className="bg-[#12121a]">Owners and Team Leads</option>
                <option value="anyone" className="bg-[#12121a]">Any active team member</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-white/80 block mb-2">
                Invitation expiration
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={settings.invitation_expiration_days}
                  onChange={e => setSettings({ ...settings, invitation_expiration_days: Math.max(1, parseInt(e.target.value) || 14) })}
                  className="w-24 h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[14px] font-semibold text-white outline-none focus:border-[#38bdf8]/50 transition-colors tabular-nums"
                />
                <span className="text-[13px] text-white/50">days</span>
              </div>
            </div>
          </div>
        </DsrtPanel>

        {/* ─── ONBOARDING ────────────────────────────────────────────────── */}
        <DsrtPanel padding="none" variant="default" className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
            <Users size={16} weight="fill" className="text-white/40" />
            <h4 className="text-[14.5px] font-bold text-white tracking-tight">Structured Onboarding</h4>
          </div>
          
          <div className="p-6 space-y-4">
            <ToggleRow 
              label="Require Profile Completion" 
              desc="Members must fill out their professional profile, skills, and preferences before joining the workspace."
              checked={!!settings.require_profile_completion}
              onChange={v => setSettings({ ...settings, require_profile_completion: v })}
            />
            <div className="h-px bg-white/[0.06]" />
            <ToggleRow 
              label="Require Work Plan Confirmation" 
              desc="Members must explicitly accept or suggest changes to their initial objectives before joining."
              checked={!!settings.require_work_plan_confirm}
              onChange={v => setSettings({ ...settings, require_work_plan_confirm: v })}
            />
          </div>
        </DsrtPanel>

        {/* ─── SECURITY & VISIBILITY ─────────────────────────────────────── */}
        <DsrtPanel padding="none" variant="default" className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-white/[0.01]">
            <ShieldCheck size={16} weight="fill" className="text-white/40" />
            <h4 className="text-[14.5px] font-bold text-white tracking-tight">Security & Visibility</h4>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="text-[12px] font-semibold text-white/80 block mb-2">
                Team Visibility
              </label>
              <select
                value={settings.team_visibility}
                onChange={e => setSettings({ ...settings, team_visibility: e.target.value as any })}
                className="w-full sm:w-80 h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[13px] font-medium text-white outline-none focus:border-[#38bdf8]/50 transition-colors [color-scheme:dark]"
              >
                <option value="project_visibility" className="bg-[#12121a]">Match project visibility</option>
                <option value="members_only" className="bg-[#12121a]">Hidden from public (Members only)</option>
                <option value="private" className="bg-[#12121a]">Private (Owners only)</option>
              </select>
              <p className="text-[11.5px] text-white/40 mt-2 leading-snug max-w-md">
                Controls who can view the "Team" tab on the project page. If set to match project visibility, a public project will have a public team roster.
              </p>
            </div>

            <div className="pt-6 border-t border-white/[0.06]">
              <label className="text-[12px] font-semibold text-white/80 block mb-2">
                Access Review Cadence
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={settings.access_review_cadence_days}
                  onChange={e => setSettings({ ...settings, access_review_cadence_days: parseInt(e.target.value) })}
                  className="w-full sm:w-80 h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[13px] font-medium text-white outline-none focus:border-[#38bdf8]/50 transition-colors [color-scheme:dark]"
                >
                  <option value={30} className="bg-[#12121a]">Every 30 days</option>
                  <option value={90} className="bg-[#12121a]">Every 90 days (Quarterly)</option>
                  <option value={180} className="bg-[#12121a]">Every 180 days (Bi-annually)</option>
                  <option value={365} className="bg-[#12121a]">Every 365 days (Annually)</option>
                </select>
              </div>
              <p className="text-[11.5px] text-white/40 mt-2 leading-snug max-w-md">
                DSRT will automatically prompt owners to review active member permissions on this schedule.
              </p>
            </div>
          </div>
        </DsrtPanel>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-4 cursor-pointer group">
      <div className="relative flex items-center justify-center w-[18px] h-[18px] shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className={cn(
            "peer appearance-none w-[18px] h-[18px] border-2 rounded transition-all cursor-pointer",
            "border-white/20 bg-white/[0.02] checked:bg-[#38bdf8] checked:border-[#38bdf8]"
          )}
        />
        <Check size={12} weight="bold" className="absolute text-[#05070D] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
      </div>
      <div>
        <p className="text-[13.5px] font-semibold text-white group-hover:text-white transition-colors">{label}</p>
        <p className="text-[12px] text-white/50 mt-0.5 leading-snug pr-4">{desc}</p>
      </div>
    </label>
  )
}