'use client'

import { useState, useEffect } from 'react'
import { X, MagnifyingGlass, User, Plus, Cube, Cloud, Database, Robot, Browsers, TerminalWindow, Monitor, Package, Wrench, Globe } from '@phosphor-icons/react'

interface Props {
  slug: string
  existingMemberIds: string[]
  onClose: () => void
  onAdded: () => void
}

const COMPONENT_TYPES = [
  { id: 'frontend', label: 'Frontend', icon: Browsers, color: 'purple' },
  { id: 'backend', label: 'Backend', icon: TerminalWindow, color: 'blue' },
  { id: 'api', label: 'API Service', icon: Cloud, color: 'cyan' },
  { id: 'database', label: 'Database', icon: Database, color: 'yellow' },
  { id: 'ml_model', label: 'ML Model', icon: Robot, color: 'green' },
  { id: 'monitoring', label: 'Monitoring', icon: Monitor, color: 'gray' },
  { id: 'service', label: 'Service', icon: Package, color: 'purple' },
  { id: 'external', label: 'External', icon: Globe, color: 'gray' },
]

export function AddNodeModal({ slug, existingMemberIds, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<'member'|'component'|'role'>('member')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [componentLabel, setComponentLabel] = useState('')
  const [componentSubtitle, setComponentSubtitle] = useState('')
  const [componentType, setComponentType] = useState('service')
  const [componentColor, setComponentColor] = useState('purple')

  useEffect(() => {
    if (tab !== 'member') return
    fetch('/api/projects/' + slug + '/graph')
      .then(r => r.json())
      .then(j => setMembers(j.members || []))
      .catch(() => {})
  }, [slug, tab])

  useEffect(() => {
    if (tab !== 'member' || query.length < 2) { setUsers([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/users/search?q=' + encodeURIComponent(query))
        const json = await res.json()
        setUsers(json.users || [])
      } catch { setUsers([]) }
    }, 200)
    return () => clearTimeout(t)
  }, [query, tab])

  useEffect(() => {
    if (tab !== 'role') return
    fetch('/api/projects/' + slug + '/roles')
      .then(r => r.json())
      .then(j => setRoles(j.roles || []))
      .catch(() => {})
  }, [slug, tab])

  const addNode = async (payload: Record<string, any>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/projects/' + slug + '/graph/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_x: 400 + Math.random() * 200,
          position_y: 300 + Math.random() * 200,
          ...payload,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(j.error || 'Failed to add')
        return
      }
      onAdded()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl w-full max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Plus size={14} weight="bold" className="text-white" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">Add node to graph</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="flex border-b border-white/[0.06]">
          {[
            { id: 'member', label: 'Member' },
            { id: 'role', label: 'Open Role' },
            { id: 'component', label: 'Component' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={
                'flex-1 py-3 text-[13px] font-medium border-b-2 transition-colors ' +
                (tab === t.id ? 'text-white border-white' : 'text-white/45 border-transparent hover:text-white/80')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'member' && (
            <>
              <div className="mb-3">
                <p className="text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">Team members</p>
                <div className="grid grid-cols-2 gap-2">
                  {members.length === 0 ? (
                    <p className="col-span-2 text-[13px] text-white/45 text-center py-6">
                      Only project members are shown. Add members to your project first.
                    </p>
                  ) : (
                    members.map((m: any) => {
                      const already = existingMemberIds.includes(m.user_id)
                      return (
                        <button
                          key={m.id}
                          onClick={() => addNode({
                            node_type: 'member',
                            member_id: m.user_id,
                            label: m.user?.full_name || 'Member',
                            subtitle: m.role || 'Member',
                            color: 'green',
                          })}
                          disabled={already || saving}
                          className={
                            'flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ' +
                            (already
                              ? 'bg-white/[0.02] border-white/[0.06] text-white/40 cursor-not-allowed'
                              : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]')
                          }
                        >
                          <div className="w-8 h-8 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {m.user?.avatar_url ? (
                              <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[11px] font-semibold text-white/70">{(m.user?.full_name || '?').charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-white truncate">{m.user?.full_name || 'Member'}</p>
                            <p className="text-[10px] text-white/50 truncate">{already ? 'Already in graph' : (m.role || 'Member')}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'role' && (
            <div>
              <p className="text-[12px] font-semibold text-white/50 uppercase tracking-wider mb-2">Open roles</p>
              {roles.length === 0 ? (
                <p className="text-[13px] text-white/45 text-center py-6">
                  No open roles yet. Create roles from the Open Roles tab first.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {roles.filter((r: any) => r.status === 'open').map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => addNode({
                        node_type: 'open_role',
                        role_id: r.id,
                        label: r.title,
                        subtitle: 'Open Role',
                        color: 'orange',
                      })}
                      disabled={saving}
                      className="w-full flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                        <Plus size={14} weight="bold" className="text-orange-300" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white">{r.title}</p>
                        <p className="text-[11px] text-orange-300">Open Role</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'component' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COMPONENT_TYPES.map(c => {
                    const Icon = c.icon
                    const active = componentType === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setComponentType(c.id); setComponentColor(c.color) }}
                        className={
                          'flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ' +
                          (active
                            ? 'bg-white/[0.06] border-white/[0.25]'
                            : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]')
                        }
                      >
                        <Icon size={16} weight={active ? 'fill' : 'regular'} className={active ? 'text-white' : 'text-white/60'} />
                        <span className={'text-[9px] font-medium leading-tight ' + (active ? 'text-white' : 'text-white/60')}>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Label</label>
                <input
                  autoFocus
                  value={componentLabel}
                  onChange={(e) => setComponentLabel(e.target.value.slice(0, 100))}
                  placeholder="e.g. Web App, API Service"
                  className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Subtitle (optional)</label>
                <input
                  value={componentSubtitle}
                  onChange={(e) => setComponentSubtitle(e.target.value.slice(0, 100))}
                  placeholder="e.g. Next.js, PostgreSQL"
                  className="w-full h-10 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addNode({
                    node_type: 'component',
                    component_type: componentType,
                    label: componentLabel.trim() || 'Component',
                    subtitle: componentSubtitle.trim() || null,
                    color: componentColor,
                  })}
                  disabled={saving || !componentLabel.trim()}
                  className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40"
                >
                  {saving ? 'Adding...' : 'Add component'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
