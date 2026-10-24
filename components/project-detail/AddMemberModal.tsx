'use client'

import { useState, useEffect } from 'react'
import { X, MagnifyingGlass, Check, Certificate, EnvelopeSimple, UserPlus } from '@phosphor-icons/react'

interface Props {
  slug: string
  onClose: () => void
  onAdded: () => void
}

const ROLES = [
  'Founder', 'Co-Founder', 'Developer', 'Designer', 'Researcher',
  'Marketing', 'Product Manager', 'Engineer', 'Advisor', 'Contributor', 'Other'
]

export function AddMemberModal({ slug, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<'search' | 'email'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Developer')
  const [customRole, setCustomRole] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (tab !== 'search' || query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/users/search?q=' + encodeURIComponent(query))
        const json = await res.json()
        setResults(json.users || [])
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [query, tab])

  const finalRole = role === 'Other' ? (customRole.trim() || 'Member') : role

  const submit = async () => {
    setSubmitting(true)
    try {
      const body: any = { role: finalRole }
      if (tab === 'search' && selectedUser) {
        body.user_id = selectedUser.id
      } else if (tab === 'email' && email.trim()) {
        body.email = email.trim()
      } else {
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/projects/' + slug + '/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      onAdded()
      onClose()
    } catch (e: any) {
      alert(e?.message || 'Failed to add member')
    } finally { setSubmitting(false) }
  }

  const canSubmit = (tab === 'search' && selectedUser) || (tab === 'email' && /\S+@\S+\.\S+/.test(email))

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <UserPlus size={18} weight="fill" className="text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Add team member</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setTab('search')}
            className={
              'flex-1 py-3 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 ' +
              (tab === 'search' ? 'text-purple-400 border-purple-500' : 'text-zinc-500 border-transparent')
            }
          >
            <MagnifyingGlass size={12} /> Search DSRT
          </button>
          <button
            onClick={() => setTab('email')}
            className={
              'flex-1 py-3 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 ' +
              (tab === 'email' ? 'text-purple-400 border-purple-500' : 'text-zinc-500 border-transparent')
            }
          >
            <EnvelopeSimple size={12} /> Invite by Email
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {tab === 'search' ? (
            <>
              {selectedUser ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-white">{(selectedUser.full_name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate">{selectedUser.full_name}</p>
                      {selectedUser.is_verified && <Certificate size={11} weight="fill" className="text-blue-400" />}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">@{selectedUser.username}</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or username..."
                      className="w-full pl-9 h-10 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500"
                    />
                  </div>
                  {results.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-[240px] overflow-y-auto">
                      {results.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.04] rounded-lg text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-semibold text-white">{(u.full_name || '?').charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-semibold text-white truncate">{u.full_name}</p>
                              {u.is_verified && <Certificate size={9} weight="fill" className="text-blue-400" />}
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate">@{u.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="person@example.com"
                className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-zinc-500 mt-2">They will receive an invitation link via email.</p>
            </div>
          )}

          {/* Role picker */}
          <div className="mt-4">
            <label className="text-[11px] text-zinc-400 mb-1 block">Role</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ' +
                    (role === r
                      ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                      : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white')
                  }
                >
                  {r}
                </button>
              ))}
            </div>
            {role === 'Other' && (
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value.slice(0, 40))}
                placeholder="Custom role..."
                className="w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-purple-500 mt-2"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 h-9 text-xs text-zinc-300 hover:text-white border border-white/[0.08] rounded-lg hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="px-5 h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? 'Adding...' : (<><Check size={12} weight="bold" /> {tab === 'email' ? 'Send Invite' : 'Add Member'}</>)}
          </button>
        </div>
      </div>
    </div>
  )
}
