'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextField } from '../shared/TextField'
import { TextAreaField } from '../shared/TextAreaField'
import { Plus, Trash, CircleNotch, Star, Calendar } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function Step10_NextMove() {
  const router = useRouter()
  const { data, updateStepField, reload, slug, flushPending } = useAssessment()

  // ── ALL HOOKS FIRST ──
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [target, setTarget] = useState('')
  const [criteria, setCriteria] = useState('')
  const [saving, setSaving] = useState(false)

  if (!data) return null

  const nm = data.steps.step10_next_move.next_move || {}
  const milestones: any[] = data.steps.step10_next_move.milestones || []

  const canContinue = Boolean(
    nm.most_important_proof && nm.most_important_proof.length >= 15 &&
    nm.thirty_day_focus && nm.thirty_day_focus.length >= 10 &&
    milestones.length >= 1
  )

  const add = async () => {
    if (title.trim().length < 3) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || null,
          target_date: target || null,
          success_criteria: criteria.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setTitle(''); setDesc(''); setTarget(''); setCriteria('')
      setAdding(false)
      await reload()
    } catch {
      toast.error('Could not add milestone')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`/api/ventures/${slug}/assessment/milestones/${id}`, { method: 'DELETE' })
      await reload()
    } catch {
      toast.error('Could not remove')
    }
  }

  const goToReview = async () => {
    await flushPending()
    // Mark step 10 completed on the way out
    try {
      await fetch(`/api/ventures/${slug}/assessment/steps/10`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _markCompleted: true }),
      })
    } catch {}
    router.push(`/ventures/${slug}/assessment/review`)
  }

  return (
    <div>
      <StepHeader
        stepNumber={10}
        title="A venture becomes real through what you do next."
        subtitle="One priority. One milestone. One commitment for the next 30 days."
      />

      <div className="mb-6">
        <FieldLabel required htmlFor="n-proof">What is the single most important thing you need to prove next?</FieldLabel>
        <FieldHint>The one open question that determines whether this works.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="n-proof"
            value={nm.most_important_proof || ''}
            maxLen={800}
            onChange={e => updateStepField(10, { most_important_proof: e.target.value })}
            rows={3}
            placeholder="e.g. That paying customers will convert from the free tier within 14 days."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="n-plan">What will you do to prove it?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="n-plan"
            value={nm.proof_action_plan || ''}
            maxLen={1000}
            onChange={e => updateStepField(10, { proof_action_plan: e.target.value })}
            rows={4}
            placeholder="The specific plan — experiments, conversations, prototypes, launches."
          />
        </div>
      </div>

      <div className="mb-8">
        <FieldLabel>Define your next milestone.</FieldLabel>
        <FieldHint>At least one milestone is required to publish.</FieldHint>

        <div className="mt-3 space-y-2.5">
          {milestones.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-xl border border-zinc-800 bg-[#121215] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {idx === 0 && (
                    <Star size={13} weight="fill" className="text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13.5px] font-semibold text-white">{m.title}</h4>
                    {m.description && (
                      <p className="text-[12px] text-zinc-400 mt-1">{m.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(m.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash size={12} />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-zinc-500">
                {m.target_date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={10} /> {new Date(m.target_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {m.success_criteria && (
                  <span className="text-zinc-400">
                    <span className="text-zinc-500">Success:</span> {m.success_criteria}
                  </span>
                )}
              </div>
            </div>
          ))}

          {adding ? (
            <div className="rounded-xl border border-zinc-700 bg-[#121215] p-4 space-y-3">
              <TextField
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Milestone title (e.g. First 20 paying customers)"
              />
              <TextAreaField
                value={desc}
                onChange={e => setDesc(e.target.value)}
                maxLen={500}
                rows={2}
                placeholder="Description (optional)"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Target date</p>
                  <input
                    type="date"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0a0a0f] border border-zinc-800 focus:border-zinc-600 text-[13.5px] text-white focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Success criteria</p>
                  <TextField
                    value={criteria}
                    onChange={e => setCriteria(e.target.value)}
                    maxLength={300}
                    placeholder="How you'll know it's done"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={add}
                  disabled={saving || title.trim().length < 3}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold bg-white text-black hover:bg-zinc-100 rounded-md disabled:opacity-50"
                >
                  {saving ? <CircleNotch size={11} className="animate-spin" /> : 'Add milestone'}
                </button>
                <button
                  onClick={() => { setAdding(false); setTitle(''); setDesc(''); setTarget(''); setCriteria('') }}
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
              <Plus size={12} weight="bold" /> Add milestone
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel required htmlFor="n-focus">
          If you could only work on one thing for the next 30 days, what would it be?
        </FieldLabel>
        <FieldHint>This becomes your public &ldquo;current focus&rdquo; on the venture page.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="n-focus"
            value={nm.thirty_day_focus || ''}
            maxLen={500}
            onChange={e => updateStepField(10, { thirty_day_focus: e.target.value })}
            rows={3}
            placeholder="The single commitment for the next 30 days."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="n-block">What is most likely to prevent you from achieving it?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="n-block"
            value={nm.biggest_blocker || ''}
            maxLen={800}
            onChange={e => updateStepField(10, { biggest_blocker: e.target.value })}
            rows={3}
            placeholder="Time, skill, capital, dependency, or something else."
          />
        </div>
      </div>

      <AssessmentStepFooter
        canContinue={canContinue}
        continueLabel="Review venture"
        onContinue={goToReview}
        isFinalStep
      />
    </div>
  )
}