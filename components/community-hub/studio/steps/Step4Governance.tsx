'use client'

import { useState } from 'react'
import { StudioSectionCard, StudioField, StudioTipCard } from '../primitives'
import type { DraftData } from '@/lib/community/service.drafts'
import { cn } from '@/lib/utils'
import { Info, Plus, X, GripVertical } from 'lucide-react'

interface Props {
  data: DraftData
  patch: (p: Partial<DraftData>) => void
}

export function Step4Governance({ data, patch }: Props) {
  const rules = data.rules || []
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const addRule = () => {
    if (!newTitle.trim()) return
    patch({ rules: [...rules, { title: newTitle.trim(), description: newDesc.trim() || undefined }] })
    setNewTitle('')
    setNewDesc('')
  }

  const remove = (idx: number) => {
    patch({ rules: rules.filter((_, i) => i !== idx) })
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= rules.length) return
    const copy = [...rules]
    ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
    patch({ rules: copy })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard
          title="Community rules"
          description="At least one rule required. Rules appear on your public page and referenced by moderation."
        >
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex flex-col pt-1">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-white/30 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white">
                    <span className="text-white/40 font-mono mr-2">{i + 1}.</span>
                    {r.title}
                  </p>
                  {r.description && (
                    <p className="mt-0.5 text-[11.5px] text-white/55 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(i)}
                  className="w-7 h-7 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Remove rule"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 space-y-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Rule title (e.g., Be kind and constructive)"
                className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[13px] text-white placeholder:text-white/25"
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                placeholder="Short description (optional)"
                className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] focus:border-white/[0.18] outline-none px-3 py-2 text-[12.5px] text-white placeholder:text-white/25 resize-none"
              />
              <div className="flex items-center justify-end">
                <button
                  onClick={addRule}
                  disabled={!newTitle.trim()}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full bg-white text-black hover:bg-zinc-100 px-3 py-1 text-[11.5px] font-semibold transition-colors',
                    !newTitle.trim() && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Plus className="w-3 h-3" strokeWidth={2.5} />
                  Add rule
                </button>
              </div>
            </div>
          </div>
        </StudioSectionCard>

        <StudioSectionCard
          title="Content policy"
          description="What ordinary members can create by default."
        >
          <div className="space-y-3">
            <ToggleRow
              label="Members can create posts"
              checked={data.allow_member_posts !== false}
              onChange={(v) => patch({ allow_member_posts: v })}
            />
            <ToggleRow
              label="Members can create polls"
              checked={data.allow_member_polls !== false}
              onChange={(v) => patch({ allow_member_polls: v })}
            />
            <ToggleRow
              label="Members can upload resources"
              hint="Slides, docs, datasets, links."
              checked={!!data.allow_member_resources}
              onChange={(v) => patch({ allow_member_resources: v })}
            />
            <ToggleRow
              label="Require moderator approval before posts publish"
              hint="Slower but keeps quality high."
              checked={!!data.require_post_approval}
              onChange={(v) => patch({ require_post_approval: v })}
            />
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="Good rules are">
          <p><strong>Specific.</strong> "No unsolicited DMs about your product" beats "No self-promotion."</p>
          <p><strong>Enforceable.</strong> Rules moderators can actually act on.</p>
          <p><strong>Short.</strong> 3–7 rules is the sweet spot.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-colors p-3 cursor-pointer">
      <div className="min-w-0">
        <p className="text-[13px] text-white/85">{label}</p>
        {hint && <p className="mt-0.5 text-[11.5px] text-white/45">{hint}</p>}
      </div>
      <span
        className={cn(
          'relative inline-flex h-5 w-9 rounded-full transition-colors border',
          checked ? 'bg-white border-white' : 'bg-white/[0.04] border-white/[0.1]'
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full transition-transform',
            checked ? 'left-4 bg-black' : 'left-0.5 bg-white'
          )}
        />
      </span>
    </label>
  )
}