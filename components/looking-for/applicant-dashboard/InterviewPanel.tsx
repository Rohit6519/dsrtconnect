'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarBlank, VideoCamera, CheckCircle, X } from '@phosphor-icons/react'

export function InterviewPanel({ applicationId }: { applicationId: string }) {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/applications/${applicationId}/interviews`)
      .then(r => r.json())
      .then(d => setItems(d.interviews || []))
  }, [applicationId])

  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6">
      <h3 className="text-[13px] font-bold text-white mb-4">Interviews</h3>
      <ul className="space-y-3">
        {items.map(iv => (
          <li key={iv.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <VideoCamera size={14} className="text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-white">{iv.title}</div>
                <div className="text-[12px] text-zinc-500 mt-0.5 flex items-center gap-2">
                  <CalendarBlank size={11} />
                  {iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString() : 'Awaiting schedule'}
                  <span className="text-zinc-700">·</span>
                  {iv.duration_min} min
                </div>
              </div>
              {iv.status === 'confirmed' && (
                <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-[10.5px] font-bold uppercase tracking-wider">
                  <CheckCircle size={10} weight="fill" /> Confirmed
                </span>
              )}
              {iv.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-red-500/25 bg-red-500/10 text-red-300 text-[10.5px] font-bold uppercase tracking-wider">
                  <X size={10} weight="bold" /> Cancelled
                </span>
              )}
            </div>
            {iv.location_url && (
              <a href={iv.location_url} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center h-9 px-3.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12.5px] font-bold">
                Join interview
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}