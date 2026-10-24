'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Rocket } from '@phosphor-icons/react'

export function SuggestedVenturesSection() {
  const [ventures, setVentures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/home/suggested/ventures?limit=4')
      .then(r => r.json())
      .then(d => setVentures(d.ventures || []))
      .catch(() => setVentures([]))
      .finally(() => setLoading(false))
  }, [])

  const handleFollow = async (id: string) => {
    setFollowingIds(prev => new Set(prev).add(id))
    try {
      await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_type: 'venture', following_id: id }),
      })
    } catch {
      setFollowingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  if (!loading && ventures.length === 0) return null

  return (
    <div className={
      'rounded-xl border border-zinc-800/60 overflow-hidden ' +
      'bg-gradient-to-b from-zinc-900/40 to-zinc-950/60 ' +
      'shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_12px_rgba(0,0,0,0.25)]'
    }>
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-1.5">
        <Rocket size={12} weight="regular" className="text-zinc-400" />
        <h3 className="text-[13px] font-bold text-white tracking-tight">Suggested Ventures</h3>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[0, 1].map(i => <div key={i} className="h-14 bg-zinc-900/50 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/40">
          {ventures.map(v => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/30 transition-colors">
              <Link href={`/ventures/${v.slug}`} className="shrink-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  {v.logo_url ? (
                    <img src={v.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[13px] font-bold text-zinc-500">
                      {v.name?.charAt(0)?.toUpperCase() || 'V'}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/ventures/${v.slug}`} className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-white truncate hover:underline tracking-tight">
                    {v.name}
                  </span>
                  {v.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400 shrink-0" />}
                </Link>
                <div className="text-[11.5px] text-zinc-500 truncate">@{v.slug}</div>
              </div>
              <button
                onClick={() => handleFollow(v.id)}
                disabled={followingIds.has(v.id)}
                className={
                  'h-8 px-3 rounded-md text-[11.5px] font-bold transition-colors shrink-0 ' +
                  (followingIds.has(v.id)
                    ? 'bg-zinc-800/60 text-zinc-500 cursor-default'
                    : 'bg-white text-black hover:bg-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]')
                }
              >
                {followingIds.has(v.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}