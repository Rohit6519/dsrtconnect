'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Check, X, User, Certificate } from '@phosphor-icons/react'

const PERMISSION_TYPES = [
  { key: 'can_view_applicants', label: 'View applicants', desc: 'See who applied to open roles' },
  { key: 'can_review_applicants', label: 'Review applicants', desc: 'Accept, reject, shortlist' },
  { key: 'can_edit_graph', label: 'Edit team graph', desc: 'Modify graph nodes & connections' },
  { key: 'can_post_updates', label: 'Post updates', desc: 'Publish updates on behalf of project' },
  { key: 'can_manage_members', label: 'Manage members', desc: 'Add or remove team members' },
  { key: 'can_manage_roles', label: 'Manage roles', desc: 'Create, edit, or close open roles' },
]

interface Props {
  slug: string
}

export function PermissionsPanel({ slug }: Props) {
  const [members, setMembers] = useState<any[]>([])
  const [permissions, setPermissions] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [graphRes, permsRes] = await Promise.all([
        fetch('/api/projects/' + slug + '/graph').then(r => r.json()),
        fetch('/api/projects/' + slug + '/permissions').then(r => r.json()),
      ])
      setMembers(graphRes.members || [])
      const map: Record<string, any> = {}
      for (const p of (permsRes.permissions || [])) {
        map[p.user_id] = p
      }
      setPermissions(map)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => { fetchAll() }, [fetchAll])

  const togglePermission = async (userId: string, key: string, current: boolean) => {
    setSaving(userId + ':' + key)
    try {
      const existing = permissions[userId] || {}
      const patch = { ...existing, [key]: !current }
      delete patch.id
      delete patch.user
      delete patch.granted_at
      delete patch.granted_by
      delete patch.project_id
      delete patch.user_id

      const res = await fetch('/api/projects/' + slug + '/permissions/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setPermissions(prev => ({ ...prev, [userId]: json.permission }))
    } catch (e) {
      console.error(e)
      alert('Failed to update permission')
    } finally { setSaving(null) }
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Shield size={16} weight="fill" className="text-purple-300" />
          <h3 className="text-[16px] font-semibold text-white">Team permissions</h3>
        </div>
        <p className="text-[13px] text-white/55 mt-0.5">Grant team members permission to help manage this project</p>
      </div>

      {loading ? (
        <div className="p-10 text-center text-[13px] text-white/45">Loading team...</div>
      ) : members.length === 0 ? (
        <div className="p-10 text-center">
          <User size={28} className="mx-auto mb-2 text-white/25" />
          <p className="text-[14px] text-white/50">No team members yet</p>
          <p className="text-[12px] text-white/35 mt-1">Add members from the Team tab to grant permissions</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {members.map((m: any) => {
            const p = permissions[m.user_id] || {}
            return (
              <div key={m.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {m.user?.avatar_url ? (
                      <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[13px] font-semibold text-white/80">{(m.user?.full_name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[14px] font-semibold text-white truncate">{m.user?.full_name || 'Member'}</p>
                      {m.user?.is_verified && <Certificate size={11} weight="fill" className="text-blue-400" />}
                    </div>
                    <p className="text-[12px] text-white/50 truncate">{m.role || 'Member'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PERMISSION_TYPES.map(pt => {
                    const isOn = !!p[pt.key]
                    const savingThis = saving === m.user_id + ':' + pt.key
                    return (
                      <label
                        key={pt.key}
                        className="flex items-start gap-2.5 p-2.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-md cursor-pointer transition-colors"
                      >
                        <button
                          onClick={(e) => { e.preventDefault(); togglePermission(m.user_id, pt.key, isOn) }}
                          disabled={savingThis}
                          className={
                            'w-9 h-5 rounded-full transition-colors flex-shrink-0 relative mt-0.5 ' +
                            (isOn ? 'bg-purple-500' : 'bg-white/[0.15]')
                          }
                        >
                          <div className={
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ' +
                            (isOn ? 'left-4' : 'left-0.5')
                          } />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-white">{pt.label}</p>
                          <p className="text-[10px] text-white/50 leading-tight mt-0.5">{pt.desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
