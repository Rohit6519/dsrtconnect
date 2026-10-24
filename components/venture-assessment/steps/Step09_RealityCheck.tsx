'use client'

import { useState } from 'react'
import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextAreaField } from '../shared/TextAreaField'
import { SelectField } from '../shared/SelectField'
import { CONFIDENCE_OPTIONS, RISK_CATEGORY_OPTIONS } from '../shared/assessment-constants'
import { Plus, Trash, CircleNotch, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function Step09_RealityCheck() {
  const { data, updateStepField, reload, slug } = useAssessment()

  // ── ALL HOOKS FIRST ──
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState('medium')
  const [rationale, setRationale] = useState('')
  const [testPlan, setTestPlan] = useState('')
  const [saving, setSaving] = useState(false)

  if (!data) return null

  const assumptions: any[] = data.steps.step9_reality_check.assumptions || []
  const risks = data.steps.step9_reality_check.risks || {}

  const canContinue = Boolean(risks.biggest_risk && risks.biggest_risk.length >= 15)

  const add = async () => {
    if (text.trim().length < 5) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/assumptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assumption_text: text.trim(),
          confidence,
          belief_rationale: rationale.trim() || null,
          test_plan: testPlan.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setText(''); setConfidence('medium'); setRationale(''); setTestPlan('')
      setAdding(false)
      await reload()
    } catch {
      toast.error('Could not add assumption')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`/api/ventures/${slug}/assessment/assumptions/${id}`, { method: 'DELETE' })
      await reload()
    } catch {
      toast.error('Could not remove')
    }
  }

  const confidenceStyle = (c: string) => {
    if (c === 'high') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    if (c === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    return 'bg-red-500/15 text-red-300 border-red-500/30'
  }

  return (
    <div>
      <StepHeader
        stepNumber={9}
        title="Every venture is built on assumptions. Identify yours before the market does it for you."
        subtitle="List what you're betting on, rate honest confidence, and describe how you'd test each one."
      />

      <div className="mb-8">
        <FieldLabel>Critical assumptions</FieldLabel>
        <FieldHint>
          Assumptions become the working hypotheses of your venture. Add as many as you have.
        </FieldHint>

        <div className="mt-3 space-y-2.5">
          {assumptions.map(a => (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-800 bg-[#121215] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-white leading-snug">
                    {a.assumption_text}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={
                        'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ' +
                        confidenceStyle(a.confidence)
                      }
                    >
                      {a.confidence} confidence
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash size={12} />
                </button>
              </div>
              {a.belief_rationale && (
                <p className="text-[12px] text-zinc-400 mt-2">
                  <span className="text-zinc-500 font-semibold">Why we believe:</span> {a.belief_rationale}
                </p>
              )}
              {a.test_plan && (
                <p className="text-[12px] text-zinc-400 mt-1">
                  <span className="text-zinc-500 font-semibold">How we&apos;ll test:</span> {a.test_plan}
                </p>
              )}
            </div>
          ))}

          {adding ? (
            <div className="rounded-xl border border-zinc-700 bg-[#121215] p-4 space-y-3">
              <TextAreaField
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                maxLen={500}
                rows={2}
                placeholder="e.g. Customers will pay ₹999/month for this solution."
              />
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                <SelectField
                  value={confidence}
                  onChange={e => setConfidence(e.target.value)}
                  options={CONFIDENCE_OPTIONS}
                />
                <div />
              </div>
              <TextAreaField
                value={rationale}
                onChange={e => setRationale(e.target.value)}
                maxLen={500}
                rows={2}
                placeholder="Why do you believe this?"
              />
              <TextAreaField
                value={testPlan}
                onChange={e => setTestPlan(e.target.value)}
                maxLen={500}
                rows={2}
                placeholder="How will you test it?"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={add}
                  disabled={saving || text.trim().length < 5}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold bg-white text-black hover:bg-zinc-100 rounded-md disabled:opacity-50"
                >
                  {saving ? <CircleNotch size={11} className="animate-spin" /> : 'Add assumption'}
                </button>
                <button
                  onClick={() => { setAdding(false); setText(''); setConfidence('medium'); setRationale(''); setTestPlan('') }}
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
              <Plus size={12} weight="bold" /> Add critical assumption
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel required htmlFor="r-biggest">What is currently the biggest risk?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="r-biggest"
            value={risks.biggest_risk || ''}
            maxLen={800}
            onChange={e => updateStepField(9, { biggest_risk: e.target.value })}
            rows={3}
            placeholder="The one thing that would most likely stop you if unaddressed."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="r-cat">Risk category</FieldLabel>
        <div className="mt-2">
          <SelectField
            id="r-cat"
            value={risks.risk_category || ''}
            onChange={e => updateStepField(9, { risk_category: e.target.value })}
            options={RISK_CATEGORY_OPTIONS}
            placeholder="Select category..."
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="r-pivot">What could fundamentally change your strategy?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="r-pivot"
            value={risks.strategy_pivot_trigger || ''}
            maxLen={800}
            onChange={e => updateStepField(9, { strategy_pivot_trigger: e.target.value })}
            rows={3}
            placeholder="A finding, event, or shift that would force a serious pivot."
          />
        </div>
      </div>

      {assumptions.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3.5 flex items-start gap-2.5">
          <Warning size={14} weight="fill" className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-200 leading-relaxed">
            You have no assumptions listed. Ventures with structured hypotheses
            demonstrate operator maturity and rank higher in Explore. Add at
            least one to strengthen your assessment.
          </p>
        </div>
      )}

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}