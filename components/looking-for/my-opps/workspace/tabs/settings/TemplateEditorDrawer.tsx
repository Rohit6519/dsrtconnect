'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, FloppyDisk } from '@phosphor-icons/react'
import { DrawerShell } from '@/components/looking-for/my-opps/command-center/parts/DrawerShell'
import { VariablePicker } from './parts/VariablePicker'
import { TemplatePreviewCard } from './parts/TemplatePreviewCard'

interface Props {
  template: {
    id: string
    template_key: string
    name: string
    subject: string
    body_markdown: string
    send_mode: 'automatic' | 'approve' | 'manual'
    effective_scope: 'global' | 'organization' | 'opportunity'
    override_id: string | null
    category: string
  }
  opportunityId: string
  onClose: () => void
  onSaved: () => void
}

export function TemplateEditorDrawer({ template, opportunityId, onClose, onSaved }: Props) {
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body_markdown)
  const [sendMode, setSendMode] = useState(template.send_mode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSubject(template.subject)
    setBody(template.body_markdown)
    setSendMode(template.send_mode)
  }, [template])

  const save = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/recruitment/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_key: template.template_key,
          opportunity_id: opportunityId,
          name: template.name,
          subject,
          body_markdown: body,
          send_mode: sendMode,
          category: template.category,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Save failed')
      onSaved()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const insertToken = (token: string) => {
    setBody(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + `{{${token}}}`)
  }

  return (
    <DrawerShell
      open
      onClose={busy ? () => {} : onClose}
      title={template.name}
      subtitle={template.template_key}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500">
            Saving creates an <span className="text-zinc-300 font-semibold">opportunity-scoped override</span>. Reset any time.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold transition-all shadow-[0_2px_16px_rgba(255,255,255,0.15)] disabled:opacity-60 whitespace-nowrap"
            >
              {busy ? <CircleNotch size={13} className="animate-spin" /> : <FloppyDisk size={13} weight="bold" />}
              Save override
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-5 min-w-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Subject</div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-white focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Message body</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-y font-sans"
            />
            <div className="mt-1 text-[10.5px] text-zinc-500">
              Use variables like <span className="font-mono text-zinc-400">{'{{candidate.first_name}}'}</span>.
              Pick from the sidebar to insert.
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Send behavior</div>
            <div className="grid grid-cols-3 gap-2">
              {(['automatic', 'approve', 'manual'] as const).map(mode => {
                const active = sendMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSendMode(mode)}
                    className={
                      'h-10 rounded-lg border text-[12px] font-semibold transition-colors ' +
                      (active
                        ? 'border-white/30 bg-white/[0.06] text-white'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 text-zinc-300')
                    }
                  >
                    {mode === 'automatic' && 'Automatic'}
                    {mode === 'approve' && 'Requires approval'}
                    {mode === 'manual' && 'Manual only'}
                  </button>
                )
              })}
            </div>
            <div className="mt-1 text-[10.5px] text-zinc-500">
              Automatic sends the moment the workflow fires. Approval opens a preview. Manual never auto-sends.
            </div>
          </div>

          <TemplatePreviewCard
            templateId={template.id}
            subject={subject}
            body={body}
            opportunityId={opportunityId}
          />

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-[12.5px] text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-0 lg:self-start">
          <VariablePicker onInsert={insertToken} />
        </div>
      </div>
    </DrawerShell>
  )
}