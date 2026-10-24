'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, Check } from '@phosphor-icons/react'

interface Props {
  interviewId: string
  opportunityId: string
}

const RECOMMENDATIONS = [
  { key: 'strong_no',  label: 'Strong no' },
  { key: 'no',         label: 'No' },
  { key: 'neutral',    label: 'Neutral' },
  { key: 'yes',        label: 'Yes' },
  { key: 'strong_yes', label: 'Strong yes' },
]

export function FeedbackForm({ interviewId, opportunityId }: Props) {
  const [criteria, setCriteria] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [recommendation, setRecommendation] = useState<string>('')
  const [strengths, setStrengths] = useState('')
  const [concerns, setConcerns] = useState('')
  const [privateNotes, setPrivateNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/opportunities/${opportunityId}/scorecards`).then(r => r.json()).then(d => {
      setCriteria(d.scorecard?.criteria || [])
    })
  }, [opportunityId])

  const submit = async () => {
    if (!recommendation) return
    setBusy(true); setSaved(false)
    try {
      const overall = Object.keys(scores).length
        ? Math.round((Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length) * 10) / 10
        : null
      const res = await fetch(`/api/interviews/${interviewId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation, scores,
          overall_rating: overall,
          strengths, concerns, private_notes: privateNotes,
        }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Criteria */}
      <div className="space-y-3">
        {criteria.map((c: any) => (
          <div key={c.key} className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-white">{c.label}</div>
              {c.description && <div className="text-[11px] text-zinc-500">{c.description}</div>}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setScores({ ...scores, [c.key]: n })}
                  className={
                    'w-8 h-8 rounded-md border text-[12px] font-bold ' +
                    (scores[c.key] === n
                      ? 'border-white/30 bg-white/[0.08] text-white'
                      : 'border-zinc-800 text-zinc-400 hover:text-white')
                  }>{n}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Recommendation</div>
        <div className="grid grid-cols-5 gap-1">
          {RECOMMENDATIONS.map(r => (
            <button key={r.key} type="button" onClick={() => setRecommendation(r.key)}
              className={
                'h-9 rounded-lg border text-[11.5px] font-semibold transition-colors ' +
                (recommendation === r.key
                  ? 'border-white/30 bg-white/[0.06] text-white'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 text-zinc-300')
              }>{r.label}</button>
          ))}
        </div>
      </div>

      <TwoCol label1="What went well" label2="Concerns" v1={strengths} v2={concerns} on1={setStrengths} on2={setConcerns} />

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Private notes (only you see this)</div>
        <textarea value={privateNotes} onChange={(e) => setPrivateNotes(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 resize-y" />
      </div>

      <button onClick={submit} disabled={busy || !recommendation}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold disabled:opacity-60">
        {busy ? <CircleNotch size={13} className="animate-spin" /> : saved ? <Check size={13} weight="bold" /> : null}
        {saved ? 'Feedback saved' : 'Submit feedback'}
      </button>
    </div>
  )
}

function TwoCol({ label1, label2, v1, v2, on1, on2 }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{label1}</div>
        <textarea value={v1} onChange={(e) => on1(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 resize-y" />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{label2}</div>
        <textarea value={v2} onChange={(e) => on2(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 resize-y" />
      </div>
    </div>
  )
}