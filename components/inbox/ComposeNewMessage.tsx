'use client'

import { useState, useEffect } from 'react'
import { X, MagnifyingGlass, User } from '@phosphor-icons/react'
import { ConnectComposer } from './ConnectComposer'

interface Props {
  onClose: () => void
  onSent: () => void
}

export function ComposeNewMessage({ onClose, onSent }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/users/search?q=' + encodeURIComponent(query))
        const json = await res.json()
        setResults(json.users || json.results || [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  // If user selected, hand off to ConnectComposer
  if (selectedUser) {
    return (
      <ConnectComposer
        recipientId={selectedUser.id}
        recipientName={selectedUser.full_name || selectedUser.username}
        onClose={onClose}
        onSent={onSent}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl w-full max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[16px] font-semibold text-white">New message</h3>
            <p className="text-[12px] text-white/50 mt-0.5">Search for someone on DSRT to start a conversation</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-9 pr-3 h-10 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.2]"
            />
          </div>

          <div className="mt-4 max-h-[360px] overflow-y-auto">
            {query.length < 2 ? (
              <p className="text-[12.5px] text-white/40 text-center py-10">
                Type at least 2 characters to search DSRT users.
              </p>
            ) : searching ? (
              <p className="text-[12.5px] text-white/45 text-center py-8">Searching...</p>
            ) : results.length === 0 ? (
              <p className="text-[12.5px] text-white/40 text-center py-8">No matching users found.</p>
            ) : (
              <div className="space-y-1">
                {results.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-white/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-white truncate">{u.full_name}</p>
                      <p className="text-[11.5px] text-white/50 truncate">@{u.username}</p>
                      {u.tagline && <p className="text-[11px] text-white/40 truncate mt-0.5">{u.tagline}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}