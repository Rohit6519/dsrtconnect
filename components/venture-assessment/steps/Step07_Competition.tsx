'use client'

import { useState } from 'react'
import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextField } from '../shared/TextField'
import { TextAreaField } from '../shared/TextAreaField'
import { SelectField } from '../shared/SelectField'
import { COMPETITOR_TYPE_OPTIONS } from '../shared/assessment-constants'
import { Plus, Trash, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function Step07_Competition() {
  const { data, updateStepField, reload, slug } = useAssessment()

  // ── ALL HOOKS FIRST ──
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('direct')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [saving, setSaving] = useState(false)

  if (!data) return null

  const competitors: any[] = data.steps.step7_competition.competitors || []
  const diff = data.steps.step7_competition.differentiation || {}

  const canContinue = Boolean(
    diff.why_choose_us && diff.why_choose_us.length >= 20 &&
    diff.why_reject_us && diff.why_reject_us.length >= 10
  )

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_name: name.trim(),
          competitor_type: type,
          strengths: strengths.trim() || null,
          weaknesses: weaknesses.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setName(''); setType('direct'); setStrengths(''); setWeaknesses('')
      setAdding(false)
      await reload()
    } catch {
      toast.error('Could not add competitor')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`/api/ventures/${slug}/assessment/competitors/${id}`, { method: 'DELETE' })
      await reload()
    } catch {
      toast.error('Could not remove')
    }
  }

  const groupBy = (arr: any[], key: string) => {
    const out: Record<string, any[]> = {}
    for (const item of arr) {
      const k = item[key] || 'other'
      if (!out[k]) out[k] = []
      out[k].push(item)
    }
    return out
  }

  const grouped = groupBy(competitors, 'competitor_type')

  const typeLabel = (t: string) => COMPETITOR_TYPE_OPTIONS.find(o => o.value === t)?.label || t

  return (
    <div>
      <StepHeader
        stepNumber={7}
        title="A strong founder understands why alternatives exist before claiming to be better."
        subtitle="Map the competitive landscape — including honesty about weaknesses."
      />

      <div className="mb-8">
        <FieldLabel>Who or what are you competing against?</FieldLabel>
        <FieldHint>
          Direct competitors, indirect alternatives, and non-consumption (people doing nothing).
        </FieldHint>

        <div className="mt-3 space-y-3">
          {(['direct', 'indirect', 'non_consumption'] as const).map(t => (
            (grouped[t] && grouped[t].length > 0) ? (
              <div key={t}>
                <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-2">
                  {typeLabel(t)}
                </p>
                <div className="space-y-2">
                  {grouped[t].map(c => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-zinc-800 bg-[#121215] p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-[13.5px] font-semibold text-white">{c.competitor_name}</h4>
                        <button
                          onClick={() => remove(c.id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                      {c.strengths && (
                        <p className="text-[12px] text-zinc-400 mb-1">
                          <span className="text-emerald-400 font-semibold">Strengths:</span> {c.strengths}
                        </p>
                      )}
                      {c.weaknesses && (
                        <p className="text-[12px] text-zinc-400">
                          <span className="text-orange-400 font-semibold">Weaknesses:</span> {c.weaknesses}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          ))}

          {adding ? (
            <div className="rounded-xl border border-zinc-700 bg-[#121215] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
                <TextField
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={200}
                  placeholder="Competitor or alternative name"
                />
                <SelectField
                  value={type}
                  onChange={e => setType(e.target.value)}
                  options={COMPETITOR_TYPE_OPTIONS}
                />
              </div>
              <TextAreaField
                value={strengths}
                onChange={e => setStrengths(e.target.value)}
                maxLen={400}
                rows={2}
                placeholder="What do they do well?"
              />
              <TextAreaField
                value={weaknesses}
                onChange={e => setWeaknesses(e.target.value)}
                maxLen={400}
                rows={2}
                placeholder="Where do they fall short?"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={add}
                  disabled={saving || !name.trim()}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold bg-white text-black hover:bg-zinc-100 rounded-md disabled:opacity-50"
                >
                  {saving ? <CircleNotch size={11} className="animate-spin" /> : 'Add competitor'}
                </button>
                <button
                  onClick={() => { setAdding(false); setName(''); setType('direct'); setStrengths(''); setWeaknesses('') }}
                  className="text-[12px] text-zinc-500 hover:text-white px-2 h-8"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <Plus size={12} weight="bold" /> Add competitor
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel required htmlFor="d-choose">Why might someone choose your approach?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="d-choose"
            value={diff.why_choose_us || ''}
            maxLen={1000}
            onChange={e => updateStepField(7, { why_choose_us: e.target.value })}
            rows={4}
            placeholder="Concrete reasons — not marketing language."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel required htmlFor="d-reject">Why might they reject it?</FieldLabel>
        <FieldHint>Honesty here is a signal of strength, not weakness.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="d-reject"
            value={diff.why_reject_us || ''}
            maxLen={1000}
            onChange={e => updateStepField(7, { why_reject_us: e.target.value })}
            rows={4}
            placeholder="The real objections you expect to hear."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="d-moat">
          What would stop a larger or existing company from building something similar?
        </FieldLabel>
        <FieldHint>
          It&apos;s okay to answer &ldquo;nothing yet.&rdquo; Being honest is better than being aspirational.
        </FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="d-moat"
            value={diff.moat_from_larger_players || ''}
            maxLen={1000}
            onChange={e => updateStepField(7, { moat_from_larger_players: e.target.value })}
            rows={4}
            placeholder="Speed, focus, insight, network, data, regulation, or something else."
          />
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}