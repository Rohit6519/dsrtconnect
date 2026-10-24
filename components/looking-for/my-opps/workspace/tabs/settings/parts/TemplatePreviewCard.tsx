'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, EyeSlash } from '@phosphor-icons/react'

interface Props {
  templateId: string
  subject: string
  body: string
  opportunityId: string
}

export function TemplatePreviewCard({ templateId, subject, body, opportunityId }: Props) {
  const [rendered, setRendered] = useState<{ subject: string; body: string; missing: string[] } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      setBusy(true)
      try {
        const res = await fetch(`/api/recruitment/templates/${templateId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, body_markdown: body, opportunity_id: opportunityId }),
        })
        const d = await res.json()
        setRendered(d)
      } catch {
        setRendered(null)
      } finally {
        setBusy(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [subject, body, templateId, opportunityId])

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#111114] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="text-[11.5px] font-bold text-zinc-400 uppercase tracking-wider">Live preview</div>
        {busy && <CircleNotch size={12} className="animate-spin text-zinc-500" />}
      </div>
      {rendered ? (
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Subject</div>
            <div className="text-[13.5px] font-semibold text-white leading-snug">{rendered.subject}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Body</div>
            <pre className="text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">{rendered.body}</pre>
          </div>
          {rendered.missing.length > 0 && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 flex items-start gap-2">
              <EyeSlash size={13} weight="fill" className="text-amber-400 mt-0.5 shrink-0" />
              <div className="text-[11.5px] text-amber-200">
                Unresolved: <span className="font-mono">{rendered.missing.join(', ')}</span>
                <div className="text-[10.5px] text-amber-300/70 mt-1">
                  Empty because their context is missing at render time (e.g. interview not scheduled yet).
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-[12px] text-zinc-500">Type in the editor to see the preview.</div>
      )}
    </div>
  )
}