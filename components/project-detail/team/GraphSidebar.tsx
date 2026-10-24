'use client'

import Link from 'next/link'
import { X, MagnifyingGlass, Certificate, Envelope, Sparkle, MapPin, Calendar } from '@phosphor-icons/react'

interface Member {
  id: string
  user_id: string
  role: string
  joined_at: string
  user?: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    is_verified: boolean
    tagline?: string | null
  }
}

interface Props {
  members: Member[]
  selectedNodeData: any | null
  query: string
  onQueryChange: (v: string) => void
  onSelectMember: (userId: string) => void
  onCloseDetails: () => void
  onMessage?: (userId: string) => void
}

export function GraphSidebar({
  members, selectedNodeData, query, onQueryChange,
  onSelectMember, onCloseDetails, onMessage
}: Props) {

  const filtered = query
    ? members.filter(m => {
        const q = query.toLowerCase()
        return (m.user?.full_name || '').toLowerCase().includes(q)
          || (m.user?.username || '').toLowerCase().includes(q)
          || (m.role || '').toLowerCase().includes(q)
      })
    : members

  return (
    <aside className="w-full lg:w-[340px] flex-shrink-0 bg-[#0f0f18] border-l border-white/[0.06] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <h3 className="text-[15px] font-semibold text-white">
          Team Members <span className="text-white/40 font-normal">({members.length})</span>
        </h3>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" size={13} />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-8 h-9 bg-white/[0.04] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
          />
        </div>
      </div>

      {/* Split: members list (shrinks when detail open) + detail panel */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className={
          'overflow-y-auto transition-all ' +
          (selectedNodeData ? 'max-h-[38%]' : 'flex-1')
        }>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-white/40">No members match.</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filtered.map(m => {
                const isSelected = selectedNodeData?.user_id === m.user_id
                return (
                  <div
                    key={m.id}
                    className={
                      'p-3 hover:bg-white/[0.02] cursor-pointer transition-colors ' +
                      (isSelected ? 'bg-purple-500/[0.08] border-l-2 border-purple-500' : '')
                    }
                    onClick={() => onSelectMember(m.user_id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {m.user?.avatar_url ? (
                          <img src={m.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[13px] font-semibold text-white/80">{(m.user?.full_name || '?').charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-[13px] font-semibold text-white truncate">{m.user?.full_name || 'Member'}</p>
                          {m.user?.is_verified && <Certificate size={10} weight="fill" className="text-blue-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-white/55 truncate">{m.role || 'Member'}</p>
                      </div>
                      <Link
                        href={'/profile/' + (m.user?.username || m.user_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-medium text-purple-300 hover:text-purple-200 whitespace-nowrap"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel (expands when node selected) */}
        {selectedNodeData && (
          <div className="border-t border-white/[0.08] flex-1 overflow-y-auto bg-white/[0.02]">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-purple-500/40">
                    {selectedNodeData.avatar_url ? (
                      <img src={selectedNodeData.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[16px] font-bold text-white/85">{(selectedNodeData.label || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-bold text-white truncate">{selectedNodeData.label}</p>
                      {selectedNodeData.is_verified && <Certificate size={12} weight="fill" className="text-blue-400" />}
                    </div>
                    <p className="text-[12px] text-white/60">{selectedNodeData.subtitle}</p>
                    {selectedNodeData.is_active !== false && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={onCloseDetails} className="text-white/40 hover:text-white p-1 flex-shrink-0">
                  <X size={16} />
                </button>
              </div>

              {selectedNodeData.tagline && (
                <p className="text-[13px] text-white/75 leading-relaxed mb-3">{selectedNodeData.tagline}</p>
              )}

              {selectedNodeData.responsibilities && selectedNodeData.responsibilities.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkle size={10} /> Core Responsibilities
                  </p>
                  <ul className="space-y-1">
                    {selectedNodeData.responsibilities.slice(0, 4).map((r: string, i: number) => (
                      <li key={i} className="text-[12px] text-white/75 flex items-start gap-1.5">
                        <span className="text-white/30 mt-1">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedNodeData.skills && selectedNodeData.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Top Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNodeData.skills.slice(0, 6).map((s: string) => (
                      <span key={s} className="text-[11px] font-medium text-white/80 bg-white/[0.06] border border-white/[0.1] px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4 text-[11px]">
                {selectedNodeData.joined_at && (
                  <div>
                    <p className="text-white/40 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Joined</p>
                    <p className="text-white/85">{new Date(selectedNodeData.joined_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                {selectedNodeData.location && (
                  <div>
                    <p className="text-white/40 uppercase tracking-wider font-semibold mb-0.5 text-[10px]">Location</p>
                    <p className="text-white/85 truncate">{selectedNodeData.location}</p>
                  </div>
                )}
              </div>

              {selectedNodeData.username && (
                <div className="flex items-center gap-2">
                  <Link
                    href={'/profile/' + selectedNodeData.username}
                    className="flex-1 text-center text-[13px] font-semibold bg-white text-black hover:bg-white/90 h-9 rounded-md flex items-center justify-center transition-colors"
                  >
                    View Full Profile
                  </Link>
                  {onMessage && (
                    <button
                      onClick={() => onMessage(selectedNodeData.user_id)}
                      className="flex-1 text-center text-[13px] font-semibold bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] h-9 rounded-md flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Envelope size={12} /> Message
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
