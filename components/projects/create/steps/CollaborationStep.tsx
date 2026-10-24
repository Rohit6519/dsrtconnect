// components/projects/create/steps/CollaborationStep.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Briefcase, MagnifyingGlass, Clock, MapPin } from '@phosphor-icons/react'
import { useProjectCreationStore } from '@/stores/projectCreationStore'

export function CollaborationStep() {
  const { data, updateData } = useProjectCreationStore()

  const [userQuery, setUserQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  const [roleFormOpen, setRoleFormOpen] = useState(false)
  const [roleTitle, setRoleTitle] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [roleCommitment, setRoleCommitment] = useState('part-time')
  const [roleMode, setRoleMode] = useState('remote')

  const roles = data.looking_for_roles || []
  const collaborators = data.collaborators || []

  useEffect(() => {
    if (userQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(userQuery)}`)
        const json = await res.json()
        setSearchResults(json.users || [])
      } catch (e) {
        console.error(e)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [userQuery])

  const addCollaborator = (u: any) => {
    if (collaborators.some(c => c.id === u.id)) return
    updateData({ collaborators: [...collaborators, u] })
    setUserQuery('')
    setSearchResults([])
  }

  const removeCollaborator = (id: string) => {
    updateData({ collaborators: collaborators.filter(c => c.id !== id) })
  }

  const handleAddRole = () => {
    if (!roleTitle.trim()) return
    const newRole = {
      id: Math.random().toString(36).substring(2, 9),
      title: roleTitle.trim(),
      description: roleDesc.trim() || undefined,
      commitment: roleCommitment,
      work_mode: roleMode,
    }

    updateData({ looking_for_roles: [...roles, newRole] })
    setRoleTitle('')
    setRoleDesc('')
    setRoleFormOpen(false)
  }

  const removeRole = (id: string) => {
    updateData({ looking_for_roles: roles.filter(r => r.id !== id) })
  }

  return (
    <div className="space-y-6">
      {/* Collaboration Status */}
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-white/90 block">
          Collaboration Preferences *
        </label>

        <div className="space-y-1.5">
          {[
            { id: 'solo', label: 'Building solo', desc: "Working on this alone for now." },
            { id: 'has_collaborators', label: 'Already have a team', desc: 'Invite existing collaborators to this project.' },
            { id: 'open_to_contributors', label: 'Open to contributors', desc: 'DSRT members can request to contribute.' },
            { id: 'looking_for_collaborators', label: 'Looking for specific roles', desc: 'Need specific skills to build this.' },
          ].map(opt => {
            const active = data.collaboration_status === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateData({ collaboration_status: opt.id as any })}
                className={`w-full flex items-center gap-3 p-3 rounded-md border text-left transition-all ${
                  active
                    ? 'bg-white/[0.04] border-white/30'
                    : 'bg-[#050505] border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-white bg-white' : 'border-white/20'}`}>
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                <div>
                  <p className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-white/80'}`}>{opt.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Invite Member Search */}
      {(data.collaboration_status === 'has_collaborators' || data.collaboration_status === 'open_to_contributors') && (
        <div className="pt-4 border-t border-white/[0.06] space-y-3">
          <label className="text-[13px] font-medium text-white/90 block">
            Invite DSRT Collaborators
          </label>

          {collaborators.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-[#050505] border border-white/10 rounded-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[11px]">
                      {c.full_name?.[0]}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">{c.full_name}</p>
                      <p className="text-[11px] text-white/40">@{c.username}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeCollaborator(c.id)} className="text-white/40 hover:text-white p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              placeholder="Search DSRT members by name or @username..."
              className="w-full h-10 pl-9 pr-4 bg-[#050505] border border-white/10 rounded-md text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF]"
            />

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0C0C0E] border border-white/10 rounded-md shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addCollaborator(u)}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-white/[0.04] text-left transition-colors"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-white">{u.full_name}</p>
                      <p className="text-[11px] text-white/40">@{u.username}</p>
                    </div>
                    <Plus size={13} className="text-white/30" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Roles */}
      {data.collaboration_status === 'looking_for_collaborators' && (
        <div className="pt-4 border-t border-white/[0.06] space-y-3">
          <div>
            <label className="text-[13px] font-medium text-white/90 flex items-center gap-1.5">
              <Briefcase size={14} className="text-[#4F7CFF]" /> Open Roles for Looking For
            </label>
            <p className="text-[12px] text-white/40 mt-0.5">
              Roles created here publish to DSRT Looking For automatically upon launch.
            </p>
          </div>

          {roles.length > 0 && (
            <div className="space-y-2">
              {roles.map(role => (
                <div key={role.id} className="p-3 bg-[#050505] border border-white/10 rounded-md flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-semibold text-white">{role.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1">
                      <span className="flex items-center gap-1"><Clock size={11} /> {role.commitment}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {role.work_mode}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeRole(role.id)} className="text-white/40 hover:text-white p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!roleFormOpen ? (
            <button
              type="button"
              onClick={() => setRoleFormOpen(true)}
              className="w-full h-9 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 bg-[#050505] hover:bg-white/[0.02] text-[12px] font-medium text-white/80 transition-all"
            >
              <Plus size={13} /> Add a role
            </button>
          ) : (
            <div className="p-4 bg-[#0A0A0C] border border-white/10 rounded-md space-y-3">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Role Title *</label>
                <input
                  autoFocus
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                  placeholder="e.g. Embedded Systems Engineer"
                  className="w-full h-9 px-3 bg-[#050505] border border-white/10 rounded-md text-[12px] text-white focus:outline-none focus:border-[#4F7CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Commitment</label>
                  <select
                    value={roleCommitment}
                    onChange={e => setRoleCommitment(e.target.value)}
                    className="w-full h-9 px-2 bg-[#050505] border border-white/10 rounded-md text-[12px] text-white outline-none"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="contributor">Contributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Work Mode</label>
                  <select
                    value={roleMode}
                    onChange={e => setRoleMode(e.target.value)}
                    className="w-full h-9 px-2 bg-[#050505] border border-white/10 rounded-md text-[12px] text-white outline-none"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="on-site">On-site</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setRoleFormOpen(false)} className="px-3 h-8 text-[12px] text-white/50 hover:text-white">
                  Cancel
                </button>
                <button type="button" onClick={handleAddRole} disabled={!roleTitle.trim()} className="px-4 h-8 rounded bg-white text-black font-semibold text-[12px] disabled:opacity-40">
                  Save Role
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}