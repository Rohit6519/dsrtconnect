'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkle } from '@phosphor-icons/react'

export function ManageMatchingTab({
  opportunityId, opportunity,
}: {
  opportunityId: string
  opportunity: any
}) {
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Reuse builders suggestions; later wire dedicated opportunity→candidate API
    fetch('/api/suggestions/builders?limit=24')
      .then(r => r.ok ? r.json() : { builders: [] })
      .then(d => setPeople(d.builders || d.users || []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }, [opportunityId])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkle size={14} className="text-blue-400" weight="fill" />
          <h2 className="text-[15px] font-bold text-white">Opportunity → Candidate matching</h2>
        </div>
        <p className="text-[12.5px] text-zinc-500 leading-relaxed">
          Suggested builders for <span className="text-zinc-300">{opportunity.title}</span> based on skills, intent, and platform activity.
          Invite-only — the system never auto-hires.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl border border-zinc-800 animate-pulse" />)}
        </div>
      ) : people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-[13px] text-zinc-500">
          Matching pool is warming up. As more builders engage, ranked candidates will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {people.map((p: any) => (
            <Link
              key={p.id}
              href={`/profile/${p.username}`}
              className="rounded-2xl border border-zinc-800/80 p-4 bg-gradient-to-b from-[#18181b] to-[#0f0f11] hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-zinc-500 font-bold">
                  {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : (p.full_name || '?').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-white truncate">{p.full_name || p.username}</div>
                  {p.tagline && <p className="text-[12px] text-zinc-400 line-clamp-2 mt-0.5">{p.tagline}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}