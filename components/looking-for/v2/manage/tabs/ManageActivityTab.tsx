'use client'

import { useEffect, useState } from 'react'

export function ManageActivityTab({ opportunityId }: { opportunityId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch(`/api/opportunities/${opportunityId}/events?limit=80`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [opportunityId])

  if (loading) return <div className="h-48 rounded-2xl border border-zinc-800 animate-pulse" />

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] to-[#0f0f11] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80">
        <h2 className="text-[15px] font-bold text-white">Activity stream</h2>
        <p className="text-[12px] text-zinc-500 mt-0.5">Meaningful events only — views, applies, stage moves, shares.</p>
      </div>
      {events.length === 0 ? (
        <div className="p-12 text-center text-[13px] text-zinc-500">No events yet. They appear as people interact with this opportunity.</div>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {events.map(ev => (
            <div key={ev.id || ev.event_id} className="px-5 py-3.5 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-zinc-200 font-medium capitalize">
                  {String(ev.event_type).replace(/_/g, ' ')}
                </div>
                <div className="text-[11.5px] text-zinc-500 mt-0.5">
                  {ev.source || 'direct'} · {new Date(ev.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}