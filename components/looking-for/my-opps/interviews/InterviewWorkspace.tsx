'use client'

import { useEffect, useState } from 'react'
import { CalendarBlank, VideoCamera, MapPin, Users, ClipboardText } from '@phosphor-icons/react'
import { FeedbackForm } from './parts/FeedbackForm'

export function InterviewWorkspace({ interviewId, currentUserId }: { interviewId: string; currentUserId: string }) {
  const [iv, setIv] = useState<any | null>(null)

  const load = async () => {
    const res = await fetch(`/api/interviews/${interviewId}`)
    const d = await res.json()
    setIv(d.interview)
  }
  useEffect(() => { load() }, [interviewId])

  if (!iv) return <div className="text-zinc-500 text-[13px]">Loading interview…</div>

  const isInterviewer = (iv.participants || []).some((p: any) => p.user_id === currentUserId && ['interviewer', 'hiring_manager'].includes(p.role))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
      {/* Left */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <VideoCamera size={16} className="text-zinc-400" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">{iv.title}</h2>
              <div className="text-[12px] text-zinc-500 capitalize mt-0.5">{iv.kind} · {iv.duration_min} min</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-[12.5px]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">When</div>
              <div className="text-white flex items-center gap-1.5"><CalendarBlank size={12} className="text-zinc-500" />
                {iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString() : 'Not scheduled'}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Where</div>
              <div className="text-white flex items-center gap-1.5">
                {iv.location_type === 'video' ? <VideoCamera size={12} /> : <MapPin size={12} />}
                {iv.location_url || iv.location_address || iv.location_type}
              </div>
            </div>
          </div>

          {iv.candidate_message && (
            <div className="mt-4 pt-4 border-t border-zinc-800/70">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Message to candidate</div>
              <div className="text-[13px] text-zinc-200 whitespace-pre-wrap">{iv.candidate_message}</div>
            </div>
          )}
        </div>

        {isInterviewer && (
          <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardText size={14} className="text-zinc-400" />
              <h3 className="text-[13px] font-bold text-white">Your feedback</h3>
            </div>
            <FeedbackForm interviewId={iv.id} opportunityId={iv.opportunity_id} />
          </div>
        )}
      </div>

      {/* Right — participants */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} className="text-zinc-400" />
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-zinc-400">Participants</h3>
        </div>
        <ul className="space-y-2">
          {(iv.participants || []).map((p: any) => (
            <li key={p.id} className="flex items-center gap-2 text-[12.5px]">
              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                {(p.profile?.full_name || p.profile?.username || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-white truncate">{p.profile?.full_name || p.profile?.username || 'User'}</div>
                <div className="text-[10.5px] text-zinc-500 capitalize">{p.role} · {p.response}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}