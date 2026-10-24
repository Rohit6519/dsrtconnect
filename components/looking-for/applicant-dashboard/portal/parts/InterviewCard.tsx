'use client'

import { useState } from 'react'
import { CalendarBlank, VideoCamera, MapPin, CheckCircle, X, CircleNotch } from '@phosphor-icons/react'

export function InterviewCard({ interview, onRefresh }: { interview: any; onRefresh: () => void }) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const scheduled = interview.scheduled_at ? new Date(interview.scheduled_at) : null
  const isPast = scheduled && scheduled.getTime() < Date.now()

  const respond = async (response: 'accepted' | 'declined') => {
    setBusy(response === 'accepted' ? 'accept' : 'decline')
    try {
      await fetch(`/api/interviews/${interview.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })
      onRefresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
          <VideoCamera size={16} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[14px] font-bold text-white">{interview.title}</div>
            <StatusPill status={interview.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-zinc-400">
            {scheduled && (
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={11} className="text-zinc-500" />
                {scheduled.toLocaleString()}
              </span>
            )}
            {interview.duration_min && <span>{interview.duration_min} min</span>}
            {interview.location_type === 'in_person' && interview.location_address && (
              <span className="flex items-center gap-1.5"><MapPin size={11} className="text-zinc-500" />{interview.location_address}</span>
            )}
          </div>
          {interview.candidate_message && (
            <div className="mt-3 pt-3 border-t border-zinc-800/70 text-[12.5px] text-zinc-300 whitespace-pre-wrap">
              {interview.candidate_message}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {interview.location_url && interview.status === 'confirmed' && !isPast && (
          <a href={interview.location_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12.5px] font-bold">
            <VideoCamera size={12} weight="fill" /> Join interview
          </a>
        )}

        {interview.status !== 'cancelled' && interview.status !== 'completed' && !isPast && (
          <>
            {interview.my_response !== 'accepted' && (
              <button
                onClick={() => respond('accepted')}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-[12px] font-semibold disabled:opacity-60"
              >
                {busy === 'accept' ? <CircleNotch size={11} className="animate-spin" /> : <CheckCircle size={11} weight="fill" />}
                Accept time
              </button>
            )}
            {interview.my_response !== 'declined' && (
              <button
                onClick={() => respond('declined')}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-300 text-[12px] font-semibold disabled:opacity-60"
              >
                {busy === 'decline' ? <CircleNotch size={11} className="animate-spin" /> : <X size={11} weight="bold" />}
                Can't make it
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'confirmed' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
    : status === 'cancelled' ? 'border-red-500/25 bg-red-500/10 text-red-300'
    : status === 'completed' ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
    : status === 'awaiting_candidate' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
    : 'border-zinc-700 bg-zinc-900 text-zinc-400'
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-md border text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}