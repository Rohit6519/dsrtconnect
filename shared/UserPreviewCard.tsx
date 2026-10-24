'use client'

import { Pencil } from '@phosphor-icons/react'
import type { DSRTUser } from '../hooks/useDSRTUserSearch'

interface Props {
  user: DSRTUser
  onChange?: () => void
}

export function UserPreviewCard({ user, onChange }: Props) {
  return (
    <div className="bg-[#0d0d10] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[18px] font-bold text-white flex-shrink-0 border-2 border-zinc-900">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          user.full_name?.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white truncate">{user.full_name}</p>
        <p className="text-[11.5px] text-zinc-400 truncate mt-0.5">@{user.username}</p>
        {user.tagline && (
          <p className="text-[11.5px] text-zinc-500 truncate mt-1 italic">{user.tagline}</p>
        )}
      </div>

      {onChange && (
        <button
          onClick={onChange}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <Pencil size={11} />
          Change
        </button>
      )}
    </div>
  )
}