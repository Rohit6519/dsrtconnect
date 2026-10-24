'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Users } from '@phosphor-icons/react'

export function PeopleYouMayKnowSection() {
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/home/suggested/people?limit=4')
      .then(r => r.json())
      .then(d => setPeople(d.people || []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }, [])

  const handleFollow = async (id: string) => {
    setFollowingIds(prev => new Set(prev).add(id))
    try {
      await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_type: 'user', following_id: id }),
      })
    } catch {
      setFollowingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  if (!loading && people.length === 0) return null

  return (
    <div className={
      'rounded-xl border border-zinc-800/60 overflow-hidden ' +
      'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 ' +
      'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.25)]'
    }>
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-1.5">
        <Users size={12} weight="regular" className="text-zinc-400" />
        <h3 className="text-[13px] font-bold text-white tracking-tight">People You May Know</h3>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[0, 1].map(i => <div key={i} className="h-14 bg-zinc-900/50 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/40">
          {people.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/30 transition-colors">
              <Link href={`/profile/${p.username}`} className="shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[13px] font-bold text-zinc-500">
                      {p.full_name?.charAt(0)?.toUpperCase() || p.username?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${p.username}`} className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-white truncate hover:underline tracking-tight">
                    {p.full_name || p.username}
                  </span>
                  {p.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400 shrink-0" />}
                </Link>
                <div className="text-[11.5px] text-zinc-500 truncate">
                  {p.tagline || `@${p.username}`}
                </div>
              </div>
              <button
                onClick={() => handleFollow(p.id)}
                disabled={followingIds.has(p.id)}
                className={
                  'h-8 px-3 rounded-md text-[11.5px] font-bold transition-colors shrink-0 ' +
                  (followingIds.has(p.id)
                    ? 'bg-zinc-800/60 text-zinc-500 cursor-default'
                    : 'border border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800')
                }
              >
                {followingIds.has(p.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}