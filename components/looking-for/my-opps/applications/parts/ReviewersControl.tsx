'use client'

import { useCallback, useEffect, useState } from 'react'
import { UserPlus, X } from '@phosphor-icons/react'

export function ReviewersControl({
  opportunityId,
  applicationId,
  onChanged,
}: {
  opportunityId: string
  applicationId: string
  onChanged: () => void
}) {
  const [assigned, setAssigned] = useState<any[]>([])
  const [members, setMembers] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const [aRes, mRes] = await Promise.all([
      fetch(`/api/opportunities/applications/${applicationId}/reviewers`),
      fetch(`/api/opportunities/${opportunityId}/members`),
    ])
    const a = await aRes.json().catch(() => ({}))
    const m = await mRes.json().catch(() => ({}))
    setAssigned(a.reviewers || [])
    const owner = m.owner ? [{ ...m.owner, isOwner: true }] : []
    setMembers([...(owner as any[]), ...((m.members || []) as any[])])
  }, [applicationId, opportunityId])

  useEffect(() => {
    load()
  }, [load])

  const assignedIds = new Set(assigned.map((r) => r.reviewer_id))

  const assign = async (uid: string) => {
    setBusy(uid)
    try {
      await fetch(`/api/opportunities/applications/${applicationId}/reviewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_id: uid }),
      })
      await load()
      onChanged()
    } finally {
      setBusy(null)
      setOpen(false)
    }
  }

  const unassign = async (uid: string) => {
    setBusy(uid)
    try {
      await fetch(
        `/api/opportunities/applications/${applicationId}/reviewers?reviewer_id=${uid}`,
        { method: 'DELETE' }
      )
      await load()
      onChanged()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2 flex items-center justify-between">
        <span>Reviewers</span>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-zinc-800 hover:border-zinc-600 text-[10.5px] font-semibold text-zinc-300 hover:text-white normal-case tracking-normal"
        >
          <UserPlus size={10} />
          Assign
        </button>
      </div>

      {assigned.length === 0 ? (
        <div className="text-[12px] text-zinc-500 rounded-xl border border-dashed border-zinc-800 p-3">
          No reviewers assigned. Assign teammates to give them visibility on this
          applicant.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {assigned.map((r) => {
            const u = r.profile || {}
            const name = u.full_name || u.username || 'Reviewer'
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center text-[10px] font-bold text-zinc-500">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    name.charAt(0)
                  )}
                </div>
                <span className="text-[12px] text-zinc-200 font-semibold truncate flex-1">
                  {name}
                </span>
                <button
                  onClick={() => unassign(r.reviewer_id)}
                  disabled={busy === r.reviewer_id}
                  className="w-6 h-6 rounded text-zinc-500 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center"
                  aria-label="Unassign"
                >
                  <X size={11} weight="bold" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <div className="mt-2 rounded-xl border border-zinc-800 bg-[#0c0c0e] max-h-[220px] overflow-y-auto">
          {members === null ? (
            <div className="p-3 text-[12px] text-zinc-500">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-3 text-[12px] text-zinc-500">
              No teammates yet. Invite people from Settings.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {members.map((m: any) => {
                const u = m.profile || {}
                const name = u.full_name || u.username || 'Member'
                const already = assignedIds.has(m.user_id)
                return (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center text-[10px] font-bold text-zinc-500">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-white truncate">
                        {name}
                      </div>
                      <div className="text-[10.5px] text-zinc-500 uppercase tracking-wider">
                        {m.isOwner ? 'Owner' : m.role}
                      </div>
                    </div>
                    <button
                      onClick={() => !already && assign(m.user_id)}
                      disabled={already || busy === m.user_id}
                      className={
                        'h-7 px-2.5 rounded-md text-[11.5px] font-semibold ' +
                        (already
                          ? 'text-zinc-500 border border-zinc-800 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-zinc-100')
                      }
                    >
                      {already ? 'Assigned' : 'Assign'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}