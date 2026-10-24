'use client'

import { useState } from 'react'
import { EnvelopeSimple, PencilSimple } from '@phosphor-icons/react'

interface Props {
  subject: string
  body: string
  onChange: (v: { subject: string; body: string }) => void
  disabled?: boolean
}

export function EmailPreviewCard({ subject, body, onChange, disabled }: Props) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#111114] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center gap-2 text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wider">
          <EnvelopeSimple size={13} className="text-zinc-500" />
          Preview candidate email
        </div>
        <button
          type="button"
          onClick={() => setEditing(e => !e)}
          disabled={disabled}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors disabled:opacity-50"
        >
          <PencilSimple size={11} weight="regular" />
          {editing ? 'Done editing' : 'Edit'}
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Subject</div>
          {editing ? (
            <input
              value={subject}
              onChange={(e) => onChange({ subject: e.target.value, body })}
              disabled={disabled}
              className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          ) : (
            <div className="text-[13.5px] font-semibold text-white leading-snug">{subject}</div>
          )}
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Message</div>
          {editing ? (
            <textarea
              value={body}
              onChange={(e) => onChange({ subject, body: e.target.value })}
              disabled={disabled}
              rows={10}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-y"
            />
          ) : (
            <pre className="text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
          )}
        </div>
      </div>
    </div>
  )
}