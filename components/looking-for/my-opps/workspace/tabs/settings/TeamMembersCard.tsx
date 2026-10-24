'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Trash, CaretDown } from '@phosphor-icons/react'

const ROLES: { value: string; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Full access. Can invite others.' },
  { value: 'manager', label: 'Manager', hint: 'Manage applicants & distribution.' },
  { value: 'reviewer', label: 'Reviewer', hint: 'Only sees assigned applicants.' },
  { value: 'viewer', label: 'Viewer', hint: 'Read-only access.' },
]

export function TeamMembersCard({ opportunityId }: { opportunityId: string }) {
  const [owner, setOwner] = useState<any | null>(null)
  const [members, setMembers] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteRole, setInviteRole] = useState('reviewer')

  const load = useCallback(async () => {
    const res = await fetch(`/api/opportunities/${opportunityId}/members`)
    const d = await res.json()
    setOwner(d.owner || null)
    setMembers(d.members || [])
  }, [opportunityId])

  useEffect(() => {
    load()
  }, [load])

  const invite = async () => {
    const username = inviteUsername.trim().replace(/^@/, '')
    if (!username) return
    setBusy('invite')
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: inviteRole }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) alert(j?.error || 'Failed to invite')
      else setInviteUsername('')
      await load()
    } finally {
      setBusy(null)
    }
  }

  const changeRole = async (m: any, role: string) => {
    setBusy(m.id)
    try {
      await fetch(`/api/opportunities/${opportunityId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: m.id, role }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const remove = async (m: any) => {
    if (
      !confirm(
        `Remove ${m.profile?.full_name || m.profile?.username || 'this user'} from the team?`
      )
    )
      return
    setBusy(m.id)
    try {
      await fetch(
        `/api/opportunities/${opportunityId}/members?member_id=${m.id}`,
        { method: 'DELETE' }
      )
      await load()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80">
        <h3 className="text-[13px] font-bold text-white">Team & reviewers</h3>
        <p className="text-[11.5px] text-zinc-500 mt-0.5">
          Invite people to help manage this opportunity. Reviewers only see the
          applicants you assign to them.
        </p>
      </div>

      <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/30 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
        <input
          value={inviteUsername}
          onChange={(e) => setInviteUsername(e.target.value)}
          placeholder="Username (e.g. @alex)"
          className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
        />
        <RoleSelect value={inviteRole} onChange={setInviteRole} />
        <button
          onClick={invite}
          disabled={busy === 'invite' || !inviteUsername.trim()}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-black text-[12.5px] font-bold hover:bg-zinc-100 disabled:opacity-60"
        >
          <UserPlus size={12} weight="bold" />
          {busy === 'invite' ? 'Adding…' : 'Add'}
        </button>
      </div>

      {!owner && members === null ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {owner && <MemberRow member={owner} isOwnerRow />}
          {(members || []).map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              disabled={busy === m.id}
              onChangeRole={(v) => changeRole(m, v)}
              onRemove={() => remove(m)}
            />
          ))}
          {members?.length === 0 && (
            <li className="px-5 py-4 text-[12.5px] text-zinc-500">
              No other members yet.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function MemberRow({
  member,
  isOwnerRow,
  disabled,
  onChangeRole,
  onRemove,
}: {
  member: any
  isOwnerRow?: boolean
  disabled?: boolean
  onChangeRole?: (v: string) => void
  onRemove?: () => void
}) {
  const u = member.profile || {}
  const name = u.full_name || u.username || 'Member'
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[12px] font-bold text-zinc-500 shrink-0">
        {u.avatar_url ? (
          <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-white truncate">{name}</span>
          {u.is_verified && (
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-[8px] font-extrabold text-blue-300 flex items-center justify-center">
              ✓
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-zinc-500 truncate">
          {u.username ? `@${u.username}` : ''}
        </div>
      </div>

      {isOwnerRow ? (
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/25 bg-emerald-500/[0.06] px-2 py-1 rounded-md">
          Owner
        </span>
      ) : (
        <>
          <RoleSelect
            value={member.role}
            onChange={(v) => onChangeRole?.(v)}
            disabled={disabled}
          />
          <button
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-red-500/25 text-[12px] text-red-300 hover:bg-red-500/10"
          >
            <Trash size={11} /> Remove
          </button>
        </>
      )}
    </li>
  )
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const current = ROLES.find((r) => r.value === value)?.label || 'Reviewer'
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white"
      >
        {current}
        <CaretDown size={11} weight="bold" className="text-zinc-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-2xl z-30 py-1">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => {
                onChange(r.value)
                setOpen(false)
              }}
              className={
                'w-full text-left px-3 py-2 transition-colors ' +
                (value === r.value
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900')
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