'use client'

import { useCallback, useEffect, useState } from 'react'

const LABEL: Record<string, string> = {
  opportunity_viewed: 'Viewed',
  opportunity_opened: 'Opened',
  apply_clicked: 'Apply clicked',
  application_started: 'Application started',
  application_submitted: 'Application submitted',
  application_abandoned: 'Application abandoned / withdrawn',
  opportunity_saved: 'Opportunity saved',
  opportunity_shared: 'Opportunity shared',
  applicant_shortlisted: 'Applicant shortlisted',
  applicant_rejected: 'Applicant rejected',
  interview_started: 'Interview stage',
  applicant_selected: 'Applicant selected',
  opportunity_paused: 'Opportunity paused',
  opportunity_resumed: 'Opportunity resumed',
  opportunity_closed: 'Opportunity closed',
  opportunity_published: 'Opportunity published',
  message_sent: 'Message sent',
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export function ActivityTab({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async (cursor?: string) => {
    const p = new URLSearchParams()
    p.set('limit', '80')
    if (cursor) p.set('cursor', cursor)
    const res = await fetch(`/api/opportunities/${opportunityId}/events?${p.toString()}`)
    const d = await res.json()
    if (cursor) setItems(prev => [...(prev || []), ...(d.events || [])])
    else setItems(d.events || [])
    setNextCursor(d.nextCursor || null)
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  if (items === null) {
    return <div className="h-48 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80">
        <h2 className="text-[13px] font-bold text-white">Activity</h2>
        <p className="text-[11.5px] text-zinc-500 mt-0.5">All meaningful events for this opportunity.</p>
      </div>
      {items.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-zinc-500">No events yet.</div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {items.map((ev: any) => (
            <li key={ev.id || ev.event_id} className="px-5 py-3 flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-2 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] text-zinc-200 font-medium">
                  {LABEL[ev.event_type] || String(ev.event_type).replace(/_/g, ' ')}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {ev.source || 'direct'} · {timeAgo(ev.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {nextCursor && (
        <div className="px-5 py-4 border-t border-zinc-800/80 flex justify-center">
          <button
            onClick={async () => { setLoadingMore(true); await load(nextCursor); setLoadingMore(false) }}
            disabled={loadingMore}
            className="h-9 px-4 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-300 hover:text-white"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}