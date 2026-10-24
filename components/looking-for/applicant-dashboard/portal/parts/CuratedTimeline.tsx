'use client'

const LABELS: Record<string, string> = {
  application_created:    'Application started',
  application_submitted:  'Application submitted',
  stage_reviewing:        'Moved to under review',
  stage_screening:        'You were shortlisted',
  stage_interviewing:     'Moved to interview',
  stage_offered:          'Offer being prepared',
  stage_hired:            'You were selected',
  stage_rejected:         'Application closed by team',
  application_withdrawn:  'You withdrew your application',
  application_reopened:   'Application reopened',
  interview_scheduled:    'Interview scheduled',
  interview_rescheduled:  'Interview rescheduled',
  interview_cancelled:    'Interview cancelled',
  interview_completed:    'Interview completed',
  communication_sent:     'Message from the team',
  communication_replied:  'You replied',
  offer_sent:             'Offer sent',
  offer_accepted:         'You accepted the offer',
  offer_declined:         'You declined the offer',
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

export function CuratedTimeline({ events }: { events: any[] }) {
  if (!events || events.length === 0) return null

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6">
      <h3 className="text-[13px] font-bold text-white mb-5">Application timeline</h3>
      <div className="relative pl-6 space-y-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-800">
        {events.map((e: any) => {
          const label = LABELS[e.event_type] || e.event_type.replace(/_/g, ' ')
          return (
            <div key={e.id} className="relative">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-zinc-950 border-2 border-zinc-700" />
              <div className="text-[13px] font-semibold text-zinc-200">{label}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {new Date(e.created_at).toLocaleString()} · {timeAgo(e.created_at)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}