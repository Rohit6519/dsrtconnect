'use client'

import { useState } from 'react'
import { PaperPlaneTilt, CircleNotch } from '@phosphor-icons/react'

export function MessageComposer({ applicationId, onSent }: { applicationId: string; onSent: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Send failed')
      setText('')
      onSent()
    } catch (e: any) {
      setError(e?.message || 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reply to the team…"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-y"
      />
      {error && (
        <div className="mt-2 text-[11.5px] text-red-300">{error}</div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="text-[10.5px] text-zinc-500">
          Sends to the team via DSRT Mail. Attached to this application.
        </div>
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12.5px] font-bold disabled:opacity-60"
        >
          {busy ? <CircleNotch size={12} className="animate-spin" /> : <PaperPlaneTilt size={12} weight="fill" />}
          Send
        </button>
      </div>
    </div>
  )
}