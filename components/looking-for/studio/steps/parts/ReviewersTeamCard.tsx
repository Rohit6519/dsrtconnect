'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { UserPlus, Trash, CaretDown, MagnifyingGlass, X, CircleNotch, User } from '@phosphor-icons/react'

const ROLES = [
  { value: 'admin', label: 'Admin', hint: 'Full access. Can invite others.' },
  { value: 'manager', label: 'Manager', hint: 'Manage applicants & distribution.' },
  { value: 'reviewer', label: 'Reviewer', hint: 'Only sees assigned applicants.' },
  { value: 'viewer', label: 'Viewer', hint: 'Read-only access.' },
]

export function ReviewersTeamCard({ opportunityId }: { opportunityId: string }) {
  const [owner, setOwner] = useState<any | null>(null)
  const [members, setMembers] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [inviteRole, setInviteRole] = useState('reviewer')

  // Search & Autocomplete State
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!opportunityId) return
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/members`)
      const d = await res.json()
      if (res.ok) {
        setOwner(d.owner || null)
        setMembers(d.members || [])
      }
    } catch (e) {
      console.error('Failed to load members:', e)
    }
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!showDropdown) return
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [showDropdown])

  // Live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const cleaned = query.trim().replace(/^@/, '')
    
    if (!cleaned) {
      setSuggestions([])
      setSearching(false)
      setLastError(null)
      return
    }

    setSearching(true)
    setLastError(null)
    
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(cleaned)}&limit=8`)
        const text = await res.text()
        
        let d: any = null
        try {
          d = JSON.parse(text)
        } catch {
          setLastError('Server returned invalid response')
          setSuggestions([])
          return
        }
        
        if (!res.ok) {
          setLastError(d?.error || `Error ${res.status}`)
          setSuggestions([])
          return
        }
        
        setSuggestions(d.users || [])
      } catch (err: any) {
        setLastError(err?.message || 'Network error')
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const submitInvite = async (userId: string) => {
    if (!opportunityId) return
    setBusy(userId)
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: inviteRole }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j?.error || 'Failed to invite user')
      } else {
        setQuery('')
        setShowDropdown(false)
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const remove = async (m: any) => {
    if (!confirm(`Remove ${m.profile?.full_name || m.profile?.username} from the team?`)) return
    setBusy(m.id)
    try {
      await fetch(`/api/opportunities/${opportunityId}/members?member_id=${m.id}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(null) }
  }

  const existingIds = new Set([owner?.user_id, ...(members || []).map(m => m.user_id)].filter(Boolean))

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-visible">
      <div className="px-5 py-4 border-b border-zinc-800/80">
        <h3 className="text-[13px] font-bold text-white">Reviewers & team</h3>
        <p className="text-[11.5px] text-zinc-500 mt-0.5">
          Search people across DSRT Connect. Reviewers only see applicants explicitly assigned to them later.
        </p>
      </div>

      <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/30 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full" ref={boxRef}>
          <div className="relative flex items-center">
            <MagnifyingGlass size={16} className="absolute left-3.5 text-zinc-500 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => query.trim() && setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowDropdown(false)
              }}
              placeholder="Search people by name or @username..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#0a0a0b] border border-zinc-800 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            />
            {searching ? (
              <CircleNotch size={15} className="absolute right-3.5 text-zinc-500 animate-spin" />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false) }}
                className="absolute right-3.5 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={15} weight="bold" />
              </button>
            ) : null}
          </div>

          {/* Search Dropdown */}
          {showDropdown && query.trim().length > 0 && (
            <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-zinc-800 bg-[#0a0a0b] shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-[100] overflow-hidden py-2">
              <div className="px-4 py-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-900">
                <User size={12} weight="bold" />
                <span>People</span>
                {searching && <span className="ml-auto text-zinc-600 normal-case tracking-normal">searching...</span>}
              </div>

              {lastError ? (
                <div className="px-4 py-4 text-[12px] text-red-400 text-center">
                  Search failed: {lastError}
                </div>
              ) : suggestions.length === 0 && !searching ? (
                <div className="px-4 py-4 text-[12.5px] text-zinc-500 text-center">
                  No people found for "{query.trim()}"
                </div>
              ) : (
                <ul className="divide-y divide-zinc-900/60 max-h-72 overflow-y-auto">
                  {suggestions.map((u: any) => {
                    const already = existingIds.has(u.id)
                    const isInviting = busy === u.id
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => !already && !isInviting && submitInvite(u.id)}
                          disabled={already || isInviting}
                          className={
                            'w-full flex items-center justify-between px-4 py-3 text-left transition-colors ' +
                            (already
                              ? 'opacity-50 cursor-not-allowed bg-zinc-950/20'
                              : 'hover:bg-zinc-900/80 cursor-pointer')
                          }
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                            {/* Dropdown Avatar (Strictly sized 36x36px) */}
                            <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[12px] font-bold text-zinc-400 shrink-0">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                              ) : (
                                (u.full_name || u.username || '?').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] font-bold text-white truncate flex items-center gap-1.5">
                                <span>{u.full_name || u.username}</span>
                                {u.is_verified && (
                                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-[8px] font-extrabold text-blue-300 flex items-center justify-center">✓</span>
                                )}
                              </div>
                              <div className="text-[11.5px] text-zinc-500 truncate mt-0.5">
                                @{u.username}{u.tagline ? ` · ${u.tagline}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isInviting ? (
                              <CircleNotch size={15} className="animate-spin text-zinc-400" />
                            ) : already ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                Added
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 transition-colors">
                                <UserPlus size={13} /> Add
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <RoleSelect value={inviteRole} onChange={setInviteRole} />
        </div>
      </div>

      {/* Team Member List */}
      {!owner && members === null ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {owner && <MemberRow member={owner} isOwnerRow />}
          {(members || []).map((m: any) => (
            <MemberRow
              key={m.id}
              member={m}
              disabled={busy === m.id}
              onChangeRole={async (r: string) => {
                setBusy(m.id)
                await fetch(`/api/opportunities/${opportunityId}/members`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ member_id: m.id, role: r }),
                })
                await load()
                setBusy(null)
              }}
              onRemove={() => remove(m)}
            />
          ))}
          {members?.length === 0 && (
            <li className="px-5 py-4 text-[12.5px] text-zinc-500 italic">
              No additional reviewers assigned yet. Search people above to invite them to your hiring team.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function MemberRow({ member, isOwnerRow, disabled, onChangeRole, onRemove }: any) {
  const u = member.profile || {}
  const name = u.full_name || u.username || 'Member'
  return (
    <li className="flex items-center gap-3.5 px-5 py-3.5">
      {/* Fixed Member Row Avatar (Strictly 40x40px) */}
      <div className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[12px] font-bold text-zinc-400 shrink-0">
        {u.avatar_url ? (
          <img src={u.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-white truncate">{name}</div>
        <div className="text-[11.5px] text-zinc-500 truncate">@{u.username}</div>
      </div>
      {isOwnerRow ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/25 bg-emerald-500/[0.06] px-2.5 py-1 rounded-md">
          Owner
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <RoleSelect value={member.role} onChange={onChangeRole} disabled={disabled} />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="h-9 px-2.5 rounded-lg border border-red-500/25 text-[12px] text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <Trash size={13} />
          </button>
        </div>
      )}
    </li>
  )
}

function RoleSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const current = ROLES.find((r) => r.value === value)?.label || 'Reviewer'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="inline-flex items-center justify-between gap-2 h-10 px-3.5 min-w-[120px] rounded-xl bg-[#0a0a0b] border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white transition-colors"
      >
        <span>{current}</span>
        <CaretDown size={11} weight="bold" className="text-zinc-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-zinc-800 bg-[#0a0a0b] shadow-[0_12px_40px_rgba(0,0,0,0.8)] z-50 py-1">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                onChange(r.value)
                setOpen(false)
              }}
              className={
                'w-full text-left px-3 py-2.5 transition-colors ' +
                (value === r.value ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-900')
              }
            >
              <div className="text-[12.5px] font-semibold">{r.label}</div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5">{r.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}