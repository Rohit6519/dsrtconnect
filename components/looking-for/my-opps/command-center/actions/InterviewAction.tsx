'use client'

import { useState, useEffect } from 'react'
import { DrawerShell } from '../parts/DrawerShell'
import { CircleNotch, Plus, X, VideoCamera } from '@phosphor-icons/react'

export interface InterviewActionProps {
  open: boolean
  onClose: () => void
  onCompleted: () => void
  applicationId: string
  opportunityId: string
  applicantName?: string | null
}

const KIND_OPTIONS = [
  { key: 'screening',   label: 'Screening' },
  { key: 'technical',   label: 'Technical' },
  { key: 'behavioral',  label: 'Behavioral' },
  { key: 'final',       label: 'Final round' },
  { key: 'portfolio',   label: 'Portfolio review' },
  { key: 'panel',       label: 'Panel' },
]

const DURATIONS = [15, 30, 45, 60, 90]

export function InterviewAction({ open, onClose, onCompleted, applicationId, opportunityId, applicantName }: InterviewActionProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [kind, setKind] = useState('screening')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [locationType, setLocationType] = useState('video')
  const [locationUrl, setLocationUrl] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [candidateMessage, setCandidateMessage] = useState('')
  const [interviewers, setInterviewers] = useState<string[]>([''])
  const [sendInvite, setSendInvite] = useState(true)
  const [scheduleReminders, setScheduleReminders] = useState(true)

  useEffect(() => {
    if (open) {
      const t = KIND_OPTIONS.find(k => k.key === kind)?.label || 'Interview'
      setTitle(`${t}${applicantName ? ` — ${applicantName}` : ''}`)
      setError(null)
    }
  }, [open, kind, applicantName])

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const scheduled_at = (date && time) ? new Date(`${date}T${time}`).toISOString() : null
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          opportunity_id: opportunityId,
          kind, title,
          duration_min: duration,
          scheduled_at,
          location_type: locationType,
          location_url: locationType === 'video' ? locationUrl : null,
          location_address: locationType === 'in_person' ? locationAddress : null,
          candidate_message: candidateMessage,
          interviewers: interviewers.filter(Boolean),
          send_invitation: sendInvite,
          schedule_reminders: scheduleReminders,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Failed to schedule')
      onCompleted()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const updateInterviewer = (i: number, v: string) => {
    const next = [...interviewers]; next[i] = v; setInterviewers(next)
  }
  const addInterviewer = () => setInterviewers([...interviewers, ''])
  const removeInterviewer = (i: number) => setInterviewers(interviewers.filter((_, idx) => idx !== i))

  return (
    <DrawerShell
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Schedule Interview"
      subtitle={applicantName ? `Interview with ${applicantName}` : 'Set up an interview for this candidate'}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500">
            Reminders 24h + 1h before will be queued automatically.
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={busy}
              className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white disabled:opacity-50">
              Cancel
            </button>
            <button onClick={submit} disabled={busy || !title.trim()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold disabled:opacity-60 whitespace-nowrap">
              {busy ? <CircleNotch size={13} className="animate-spin" /> : <VideoCamera size={13} weight="bold" />}
              Schedule Interview
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Kind */}
        <div>
          <SectionLabel>Type</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {KIND_OPTIONS.map(k => (
              <button key={k.key} type="button" onClick={() => setKind(k.key)}
                className={
                  'h-9 rounded-lg border text-[12px] font-semibold transition-colors ' +
                  (kind === k.key
                    ? 'border-white/30 bg-white/[0.06] text-white'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 text-zinc-300')
                }>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <SectionLabel>Title</SectionLabel>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-white focus:outline-none focus:border-zinc-700" />
        </div>

        {/* Date + Time + Duration */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <SectionLabel>Date</SectionLabel>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
          </div>
          <div>
            <SectionLabel>Start time</SectionLabel>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
          </div>
          <div>
            <SectionLabel>Duration</SectionLabel>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700">
              {DURATIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <SectionLabel>Where</SectionLabel>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {(['video','phone','in_person','async'] as const).map(l => (
              <button key={l} type="button" onClick={() => setLocationType(l)}
                className={
                  'h-9 rounded-lg border text-[12px] font-semibold transition-colors ' +
                  (locationType === l
                    ? 'border-white/30 bg-white/[0.06] text-white'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 text-zinc-300')
                }>
                {l === 'video' ? 'Video' : l === 'phone' ? 'Phone' : l === 'in_person' ? 'In person' : 'Async'}
              </button>
            ))}
          </div>
          {locationType === 'video' && (
            <input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
          )}
          {locationType === 'in_person' && (
            <input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Address"
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
          )}
        </div>

        {/* Interviewers */}
        <div>
          <SectionLabel>Interviewers (DSRT user IDs)</SectionLabel>
          <div className="space-y-2">
            {interviewers.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={v} onChange={(e) => updateInterviewer(i, e.target.value)}
                  placeholder="user_id"
                  className="flex-1 h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
                <button type="button" onClick={() => removeInterviewer(i)}
                  className="w-9 h-9 rounded-lg border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-300 flex items-center justify-center">
                  <X size={13} weight="bold" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addInterviewer}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[12.5px] text-zinc-300 hover:text-white">
              <Plus size={12} weight="bold" /> Add interviewer
            </button>
          </div>
          <div className="text-[10.5px] text-zinc-500 mt-1">
            Phase 4a: paste DSRT user IDs. Phase 4b will add a searchable people picker.
          </div>
        </div>

        {/* Candidate message */}
        <div>
          <SectionLabel>Candidate message (optional)</SectionLabel>
          <textarea value={candidateMessage} onChange={(e) => setCandidateMessage(e.target.value)}
            rows={3} placeholder="Anything you want the candidate to know…"
            className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 resize-y" />
        </div>

        {/* Options */}
        <div className="space-y-2">
          <Toggle checked={sendInvite} onChange={setSendInvite} label="Send DSRT Mail invitation to candidate now" />
          <Toggle checked={scheduleReminders} onChange={setScheduleReminders} label="Queue 24h + 1h reminders" />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-[12.5px] text-red-300">
            {error}
          </div>
        )}
      </div>
    </DrawerShell>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{children}</div>
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 accent-white cursor-pointer" />
      <div className="text-[13px] text-white">{label}</div>
    </label>
  )
}