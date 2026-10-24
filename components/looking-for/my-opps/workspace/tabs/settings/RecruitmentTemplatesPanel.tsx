'use client'

import { useCallback, useEffect, useState } from 'react'
import { EnvelopeSimple, PencilSimple, Warning, Sparkle, Trash } from '@phosphor-icons/react'
import { TemplateEditorDrawer } from './TemplateEditorDrawer'

interface Props {
  opportunityId: string
  opportunityTitle: string
}

interface EffectiveTemplate {
  id: string
  template_key: string
  name: string
  subject: string
  body_markdown: string
  send_mode: 'automatic' | 'approve' | 'manual'
  effective_scope: 'global' | 'organization' | 'opportunity'
  override_id: string | null
  is_system: boolean
  category: string
  description: string | null
  version: number
}

const SEND_MODE_LABEL: Record<string, string> = {
  automatic: 'Automatic',
  approve: 'Requires approval',
  manual: 'Manual only',
}

export function RecruitmentTemplatesPanel({ opportunityId, opportunityTitle }: Props) {
  const [items, setItems] = useState<EffectiveTemplate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EffectiveTemplate | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/recruitment/templates?opportunity_id=${opportunityId}&scope=effective`)
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Failed')
      setItems(d.templates || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load templates')
      setItems([])
    }
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  const resetOverride = async (t: EffectiveTemplate) => {
    if (!t.override_id) return
    if (!confirm(`Reset "${t.name}" back to the DSRT default?`)) return
    const res = await fetch(`/api/recruitment/templates/${t.override_id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
          <EnvelopeSimple size={16} className="text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-white">Candidate communication templates</div>
          <div className="text-[11.5px] text-zinc-500 mt-0.5">
            These templates control what candidates see when they progress through the pipeline for
            <span className="text-zinc-300 font-semibold"> {opportunityTitle}</span>. DSRT defaults are used unless you override.
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-500/25 bg-red-500/[0.06] p-3 text-[12px] text-red-300 flex items-start gap-2">
          <Warning size={13} weight="fill" className="mt-0.5" />
          {error}
        </div>
      )}

      {items === null ? (
        <div className="p-5 space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-zinc-500">
          No templates found. Contact support if this looks wrong.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {items.map(t => {
            const isOverride = t.effective_scope === 'opportunity'
            return (
              <li key={t.id} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13px] font-bold text-white">{t.name}</div>
                      <span className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500">
                        {t.template_key}
                      </span>
                      {isOverride ? (
                        <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md border border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                          <Sparkle size={9} weight="fill" /> Custom
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-5 px-2 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                          DSRT default
                        </span>
                      )}
                      <span className="inline-flex items-center h-5 px-2 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                        {SEND_MODE_LABEL[t.send_mode] || t.send_mode}
                      </span>
                    </div>
                    <div className="text-[12px] text-zinc-400 mt-1 line-clamp-1">{t.subject}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOverride && (
                      <button
                        onClick={() => resetOverride(t)}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-800 hover:border-red-500/40 text-[11.5px] font-semibold text-zinc-400 hover:text-red-300 transition-colors"
                      >
                        <Trash size={11} />
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12px] font-bold transition-colors"
                    >
                      <PencilSimple size={11} weight="bold" />
                      {isOverride ? 'Edit' : 'Customize'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <TemplateEditorDrawer
          template={editing}
          opportunityId={opportunityId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}