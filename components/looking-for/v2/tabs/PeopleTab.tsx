'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CheckCircle, ArrowUpRight } from '@phosphor-icons/react'

export function PeopleTab() {
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Reuse existing suggested builders endpoint if it exists; fall back gracefully
    fetch('/api/suggestions/builders?limit=24')
      .then(r => r.ok ? r.json() : { builders: [] })
      .then(d => setPeople(d.builders || d.users || []))
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <Users size={20} className="text-zinc-500" />
        </div>
        <h2 className="text-[16px] font-bold text-white mb-1.5">People to work with</h2>
        <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto leading-relaxed">
          As you add categories and skills, we'll suggest builders who complement your work.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-zinc-500">
        Builders whose skills and interests match yours.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {people.map((p: any) => (
          <PersonCard key={p.id} person={p} />
        ))}
      </div>
    </div>
  )
}

function PersonCard({ person }: { person: any }) {
  return (
    <Link
      href={`/profile/${person.username}`}
      className="group flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
    >
      <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
        {person.avatar_url ? (
          <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[13px] font-bold text-zinc-500">
            {(person.full_name || person.username || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h4 className="text-[13.5px] font-bold text-white group-hover:text-blue-400 truncate transition-colors">
            {person.full_name || person.username}
          </h4>
          {person.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400 shrink-0" />}
        </div>
        {person.tagline && (
          <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">
            {person.tagline}
          </p>
        )}
        {person.location && (
          <p className="text-[11px] text-zinc-500 mt-1.5">{person.location}</p>
        )}
      </div>
      <ArrowUpRight size={11} weight="bold" className="text-zinc-600 group-hover:text-blue-400 shrink-0 mt-1" />
    </Link>
  )
}