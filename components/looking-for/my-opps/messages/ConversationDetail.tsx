'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  PaperPlaneTilt,
  Notepad,
} from '@phosphor-icons/react'

const STAGE_ORDER = [
  'submitted',
  'under-review',
  'shortlisted',
  'interview',
  'offer',
  'accepted',
  'declined',
  'withdrawn',
]
const STAGE_LABEL: Record<string, string> = {
  submitted: 'New',
  'under-review': 'Reviewing',
  shortlisted: 'Shortlist',
  interview: 'Interview',
  offer: 'Offer',
  accepted: 'Select',
  declined: 'Reject',
  withdrawn: 'Withdrawn',
}

export function ConversationDetail({
  convo,
  onBack,
  onReload,
}: {
  convo: any
  onBack: () => void
  onReload: () => void
}) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'message' | 'note'>('message')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [convo.timeline])

  const handleStageChange = async (stage: string) => {
    try {
      await fetch(
        `/api/opportunities/${convo.opportunity.id}/applicants/${convo.application_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pipeline_stage: stage }),
        }
      )
      onReload()
    } catch {}
  }

  const handleSend = async () => {
  const value = text.trim()
  if (!value || busy) return
  setBusy(true)
  try {
    let res: Response
    if (mode === 'message') {
      res = await fetch('/api/opportunities/dashboard/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: convo.application_id,
          text: value,
        }),
      })
    } else {
      res = await fetch(
        `/api/opportunities/applications/${convo.application_id}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: value }),
        }
      )
    }

    const raw = await res.text()
    let data: any = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      /* keep null */
    }

    if (!res.ok) {
      throw new Error(data?.error || `Failed (${res.status})`)
    }

    setText('')
    onReload()
  } catch (e: any) {
    alert(e?.message || 'Failed to send')
  } finally {
    setBusy(false)
  }
}
  const name = convo.applicant?.full_name || convo.applicant?.username || 'Applicant'

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-zinc-800/80 px-5 py-4 shrink-0 bg-zinc-950/40">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-800 text-zinc-400 hover:text-white bg-zinc-950"
          >
            <ArrowLeft size={14} weight="bold" />
          </button>

          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
            {convo.applicant?.avatar_url ? (
              <img
                src={convo.applicant.avatar_url}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <span className="text-[12px] font-bold text-zinc-500">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[15px] font-bold text-white truncate">{name}</h2>
              {convo.applicant?.is_verified && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-[8px] font-extrabold text-blue-300 flex items-center justify-center">
                  ✓
                </span>
              )}
            </div>
            <div className="text-[12px] font-medium text-zinc-500 truncate">
              {convo.opportunity?.title}
            </div>
          </div>

          <Link
            href={`/looking-for/my-opportunities/applications?app=${convo.application_id}`}
            className="shrink-0 h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-[12px] font-semibold text-zinc-300 hover:text-white flex items-center"
          >
            View full app
          </Link>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pt-1">
          {STAGE_ORDER.filter((s) => s !== 'withdrawn').map((s) => {
            const isCurrent = convo.application?.pipeline_stage === s
            const isRed = s === 'declined'
            return (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={
                  'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap ' +
                  (isCurrent
                    ? isRed
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-white/20 bg-white/10 text-white'
                    : 'border-zinc-800/80 bg-zinc-950/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700')
                }
              >
                {isCurrent && !isRed && (
                  <CheckCircle size={11} weight="fill" className="text-emerald-400" />
                )}
                {STAGE_LABEL[s]}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="text-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-600 mb-6 mt-2">
          Application Submitted
        </div>

        {(convo.timeline || []).map((item: any) => {
          if (item.type === 'note') {
            return (
              <div key={item.id} className="flex justify-center my-6">
                <div className="max-w-[85%] rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Notepad size={12} weight="fill" className="text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
                      Internal Note
                    </span>
                    <span className="text-[11px] text-amber-500/50 ml-auto">
                      {item.author?.full_name?.split(' ')[0] || 'Team'} ·{' '}
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[13px] text-amber-100/90 whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </div>
                </div>
              </div>
            )
          }

          const isOwner = item.is_owner
          return (
            <div
              key={item.id}
              className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-end gap-2 max-w-[80%]">
                {!isOwner && (
                  <div className="w-6 h-6 rounded-full bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center text-[9px] font-bold text-zinc-500 mb-1">
                    {convo.applicant?.avatar_url ? (
                      <img
                        src={convo.applicant.avatar_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      name.charAt(0)
                    )}
                  </div>
                )}
                <div
                  className={
                    'px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap ' +
                    (isOwner
                      ? 'bg-zinc-200 text-black rounded-br-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm')
                  }
                >
                  {item.body}
                </div>
              </div>
              <div
                className={`text-[10.5px] text-zinc-600 mt-1 px-1 ${isOwner ? 'mr-1' : 'ml-9'}`}
              >
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 shrink-0">
        <div
          className={`rounded-xl border focus-within:border-zinc-600 transition-colors bg-[#0a0a0b] overflow-hidden ${
            mode === 'note'
              ? 'border-amber-500/40 focus-within:border-amber-500'
              : 'border-zinc-800'
          }`}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              mode === 'note'
                ? 'Write a private note to your team...'
                : `Reply to ${name.split(' ')[0]}...`
            }
            className={`w-full max-h-40 min-h-[80px] p-3 text-[13.5px] resize-none focus:outline-none bg-transparent ${
              mode === 'note'
                ? 'text-amber-100 placeholder:text-amber-500/40'
                : 'text-zinc-200 placeholder:text-zinc-600'
            }`}
          />
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-t border-zinc-800/50">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <button
                onClick={() => setMode('message')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  mode === 'message'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Reply
              </button>
              <button
                onClick={() => setMode('note')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  mode === 'note'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-zinc-500 hover:text-amber-400'
                }`}
              >
                Internal Note
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={busy || !text.trim()}
              className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 ${
                mode === 'note'
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {busy ? (
                'Sending…'
              ) : mode === 'note' ? (
                'Save Note'
              ) : (
                <>
                  <PaperPlaneTilt size={13} weight="fill" /> Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}