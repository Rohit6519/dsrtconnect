'use client'

import { UserSearchInput } from '../shared/UserSearchInput'
import { UserPreviewCard } from '../shared/UserPreviewCard'
import type { DSRTUser } from '../hooks/useDSRTUserSearch'

interface Props {
  selectedUser: DSRTUser | null
  onSelectUser: (user: DSRTUser | null) => void
}

export function Step1_SelectUser({ selectedUser, onSelectUser }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">Who are you inviting?</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Search the DSRT directory for the user you'd like to invite to your team.
        </p>
      </div>

      {!selectedUser ? (
        <UserSearchInput onSelect={onSelectUser} autoFocus />
      ) : (
        <UserPreviewCard user={selectedUser} onChange={() => onSelectUser(null)} />
      )}

      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          <strong className="text-zinc-400">Note:</strong> Only registered DSRT users can be invited.
          If someone isn't on DSRT yet, ask them to sign up first — their invitation will be waiting.
        </p>
      </div>
    </div>
  )
}