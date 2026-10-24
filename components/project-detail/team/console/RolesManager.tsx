'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck, Plus, CheckCircle, WarningCircle, CircleNotch,
  PencilSimple, Trash, Users, Sliders, Eye
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { AccessPermissions } from '@/types/team'
import { PermissionMatrixEditor } from './PermissionMatrixEditor'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
}

interface RoleDef {
  id: string
  key: string
  label: string
  description: string | null
  is_system: boolean
  is_leadership: boolean
  default_permissions: AccessPermissions
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function RolesManager({ projectId, slug }: Props) {
  const [roles, setRoles] = useState<RoleDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'templates' | 'members'>('templates')
  
  // Editor State
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: dbErr } = await supabase
        .from('project_team_role_definitions')
        .select('*')
        .or(`project_id.eq.${projectId},is_system.eq.true`)
        .order('is_system', { ascending: false })
        .order('label')

      if (dbErr) throw dbErr
      if (isMountedRef.current) setRoles(data as RoleDef[])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load roles')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete the custom role "${label}"? Existing members with this role will keep their current permissions, but the template will be gone.`)) return
    
    try {
      const supabase = createClient()
      const { error: delErr } = await supabase
        .from('project_team_role_definitions')
        .delete()
        .eq('id', id)
        .eq('project_id', projectId) // safety guard

      if (delErr) throw delErr
      toast.success('Role template deleted')
      setRoles(prev => prev.filter(r => r.id !== id))
    } catch {
      toast.error('Failed to delete role')
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  if (editingRole || isCreating) {
    return (
      <RoleEditor
        role={editingRole}
        projectId={projectId}
        onClose={() => { setEditingRole(null); setIsCreating(false) }}
        onSaved={() => { setEditingRole(null); setIsCreating(false); fetchRoles() }}
      />
    )
  }

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">Roles & Access</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Manage permission templates and review member access levels.
          </p>
        </div>
        {activeTab === 'templates' && (
          <DsrtButton
            variant="primary"
            size="sm"
            className="bg-white text-black hover:bg-white/90"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} weight="bold" /> Create custom role
          </DsrtButton>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'templates', label: 'Role Templates', icon: ShieldCheck },
          { id: 'members', label: 'Member Access', icon: Users },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors outline-none',
              activeTab === t.id
                ? 'text-[#38bdf8] border-[#38bdf8]'
                : 'text-white/45 border-transparent hover:text-white/75'
            )}
          >
            <t.icon size={15} weight={activeTab === t.id ? 'fill' : 'regular'} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <CircleNotch size={18} className="animate-spin text-white/30" />
            <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading...</span>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
            <WarningCircle size={22} className="text-red-400" />
            <span className="text-[13px] text-red-300">{error}</span>
          </div>
        ) : activeTab === 'templates' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(role => (
              <div key={role.key} className="flex flex-col justify-between p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.03] transition-colors relative group">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} weight="fill" className={role.is_leadership ? "text-purple-400" : "text-[#38bdf8]"} />
                      <h4 className="text-[14.5px] font-bold text-white leading-tight">{role.label}</h4>
                    </div>
                    {role.is_system ? (
                      <span className="text-[9px] font-mono uppercase tracking-widest text-white/30 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded">System</span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/20 px-1.5 py-0.5 rounded">Custom</span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-white/50 leading-relaxed mb-4 min-h-[40px]">
                    {role.description}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-[11.5px] text-white/40 font-mono">
                    {countPerms(role.default_permissions)} permissions
                  </span>
                  
                  {!role.is_system && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingRole(role)} className="w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors">
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <button onClick={() => handleDelete(role.id, role.label)} className="w-8 h-8 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                        <Trash size={14} weight="bold" />
                      </button>
                    </div>
                  )}
                  {role.is_system && (
                    <button onClick={() => setEditingRole(role)} className="text-[11px] font-semibold text-white/30 hover:text-white transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Eye size={12} weight="bold" /> View Matrix
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
            <Sliders size={32} weight="duotone" className="text-white/20 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-white/60 mb-1">Member Access Review</p>
            <p className="text-[12.5px] text-white/40">
              Granular member permission editing is coming in the next phase.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB: ROLE EDITOR
// ═══════════════════════════════════════════════════════════════════════════

function RoleEditor({ role, projectId, onClose, onSaved }: { role: RoleDef | null, projectId: string, onClose: () => void, onSaved: () => void }) {
  const isSystem = role?.is_system
  const [label, setLabel] = useState(role?.label || '')
  const [desc, setDesc] = useState(role?.description || '')
  const [isLead, setIsLead] = useState(role?.is_leadership || false)
  const [perms, setPerms] = useState<AccessPermissions>(role?.default_permissions || {
    project: { view: true, edit: false, delete: false },
    team: { view: true, invite: false, remove: false, manage_permissions: false },
    projects: { view: true, create: false, edit: false, archive: false },
    financial: { view: false, manage: false },
    research: { view: false, create: false, edit: false },
    mail: { use: true, team_comm: true },
    analytics: { view: false, export: false },
  })
  
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (isSystem) { onClose(); return }
    if (!label.trim()) return toast.error('Role name required')
    
    setSaving(true)
    try {
      const supabase = createClient()
      const key = label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
      
      const payload = {
        project_id: projectId,
        key: role?.key || `${key}_${Math.random().toString(36).slice(2, 6)}`,
        label: label.trim(),
        description: desc.trim() || null,
        is_leadership: isLead,
        default_permissions: perms
      }

      if (role) {
        const { error } = await supabase.from('project_team_role_definitions').update(payload).eq('id', role.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('project_team_role_definitions').insert(payload)
        if (error) throw error
      }

      toast.success(role ? 'Role updated' : 'Role created')
      onSaved()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-in fade-in duration-200 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-5">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">
            {isSystem ? 'View System Role' : role ? 'Edit Custom Role' : 'Create Custom Role'}
          </h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            {isSystem ? 'System roles cannot be modified.' : 'Define the defaults for this template.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DsrtButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            {isSystem ? 'Back' : 'Cancel'}
          </DsrtButton>
          {!isSystem && (
            <DsrtButton variant="primary" size="sm" className="bg-white text-black hover:bg-white/90" onClick={handleSave} loading={saving} disabled={!label.trim()}>
              Save Role
            </DsrtButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        {/* Left: Metadata */}
        <div className="space-y-5">
          <div>
            <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Role Name *</label>
            <input 
              value={label} 
              onChange={e => setLabel(e.target.value)} 
              disabled={isSystem || saving}
              placeholder="e.g. Marketing Lead"
              className="w-full h-11 bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 disabled:opacity-50" 
            />
          </div>
          <div>
            <label className="text-[11.5px] font-mono font-bold uppercase tracking-wider text-white/50 mb-2 block">Description</label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
              disabled={isSystem || saving}
              rows={3}
              placeholder="What authority does this role grant?"
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl p-4 text-[13.5px] text-white placeholder:text-white/30 outline-none focus:border-[#38bdf8]/50 resize-none disabled:opacity-50" 
            />
          </div>
          <label className={cn("flex items-start gap-3 p-4 rounded-xl border transition-colors", isSystem ? "bg-white/[0.02] border-white/[0.04] opacity-70" : "bg-[#121215] border-white/[0.08] cursor-pointer hover:bg-white/[0.04]")}>
            <input type="checkbox" checked={isLead} onChange={e => !isSystem && setIsLead(e.target.checked)} disabled={isSystem || saving} className="mt-0.5 w-4 h-4 accent-purple-500" />
            <div>
              <p className="text-[13.5px] font-bold text-white">Leadership Role</p>
              <p className="text-[11.5px] text-white/50 mt-0.5">Highlights members with this role as leadership in the team graph.</p>
            </div>
          </label>
        </div>

        {/* Right: Matrix */}
        <div className="bg-[#121215] border border-white/[0.06] rounded-2xl p-6">
          <h4 className="text-[13px] font-bold text-white mb-1">Permission Matrix</h4>
          <p className="text-[11.5px] text-white/50 mb-6">Select the default access rights granted by this role.</p>
          <PermissionMatrixEditor 
            value={perms} 
            onChange={setPerms} 
            disabled={isSystem || saving} 
          />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function countPerms(perms: AccessPermissions): number {
  let count = 0
  for (const cat of Object.values(perms)) {
    if (!cat || typeof cat !== 'object') continue
    for (const val of Object.values(cat)) if (val) count++
  }
  return count
}