'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const LABEL: Record<string, string> = {
  application_submitted: 'New application received',
  applicant_reviewing:   'Applicant moved to reviewing',
  applicant_shortlisted: 'Applicant shortlisted',
  applicant_screening:   'Applicant shortlisted',
  applicant_interview:   'Interview scheduled',
  applicant_interviewing:'Interview scheduled',
  applicant_offered:     'Offer prepared',
  applicant_hired:       'Applicant selected',
  applicant_selected:    'Applicant selected',
  applicant_rejected:    'Applicant rejected',
  opportunity_paused:    'Opportunity paused',
  opportunity_resumed:   'Opportunity resumed',
  opportunity_closed:    'Opportunity closed',
  opportunity_published: 'Opportunity published',
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export function RecentActivity() {
  const [events, setEvents] = useState<any[] | null>(null)

  useEffect(() => {
    fetch('/api/opportunities/dashboard/activity?limit=15')
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => setEvents(d.events || []))
      .catch(() => setEvents([]))
  }, [])

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80">
        <h2 className="text-[13px] font-bold text-white">Recent Activity</h2>
      </div>

      {events === null ? (
        <div className="p-6 space-y-2">
          {[0,1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-zinc-900/40 animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-zinc-500">No recent activity yet.</div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {events.map(ev => (
            <li key={ev.id} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-2" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-zinc-200">
                    {LABEL[ev.type] || ev.type.replace(/_/g, ' ')}
                    {ev.opportunity?.title && (
                      <>
                        {' · '}
                        <Link href={`/looking-for/my-opportunities/${ev.opportunity.id}`} className="text-zinc-400 hover:text-white">
                          {ev.opportunity.title}
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{timeAgo(ev.at)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}