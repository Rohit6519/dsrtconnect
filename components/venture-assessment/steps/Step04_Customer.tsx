'use client'

import { useState } from 'react'
import { useAssessment } from '../AssessmentContext'
import { AssessmentStepFooter } from '../AssessmentStepFooter'
import { StepHeader } from './StepHeader'
import { FieldLabel } from '../shared/FieldLabel'
import { FieldHint } from '../shared/FieldHint'
import { TextField } from '../shared/TextField'
import { TextAreaField } from '../shared/TextAreaField'
import { Plus, Trash, CircleNotch } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function Step04_Customer() {
  const { data, updateStepField, reload, slug } = useAssessment()

  // ── ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN ──
  const [addingAlt, setAddingAlt] = useState(false)
  const [altName, setAltName] = useState('')
  const [altWorks, setAltWorks] = useState('')
  const [altFails, setAltFails] = useState('')
  const [saving, setSaving] = useState(false)

  if (!data) return null

  const profile = data.steps.step4_customer.profile || {}
  const alternatives: any[] = data.steps.step4_customer.alternatives || []

  const canContinue = Boolean(profile.first_customer && profile.first_customer.length >= 5)

  const addAlternative = async () => {
    if (!altName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alternative_name: altName.trim(),
          what_works: altWorks.trim() || null,
          where_fails: altFails.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setAltName(''); setAltWorks(''); setAltFails('')
      setAddingAlt(false)
      await reload()
    } catch {
      toast.error('Could not add alternative')
    } finally {
      setSaving(false)
    }
  }

  const removeAlternative = async (id: string) => {
    try {
      await fetch(`/api/ventures/${slug}/assessment/alternatives/${id}`, { method: 'DELETE' })
      await reload()
    } catch {
      toast.error('Could not remove')
    }
  }

  return (
    <div>
      <StepHeader
        stepNumber={4}
        title="Let's understand the world as it exists today."
        subtitle="Your first customer, how they cope now, and what would make them change."
      />

      <div className="mb-6">
        <FieldLabel required htmlFor="c-first">Who is your first real customer or user?</FieldLabel>
        <FieldHint>Not the entire market — one specific persona or company profile.</FieldHint>
        <div className="mt-2">
          <TextAreaField
            id="c-first"
            value={profile.first_customer || ''}
            maxLen={500}
            onChange={e => updateStepField(4, { first_customer: e.target.value })}
            rows={3}
            placeholder="e.g. Solo product managers at Series A SaaS companies with 20–50 employees."
          />
        </div>
      </div>

      {/* Alternatives */}
      <div className="mb-6">
        <FieldLabel>How do they solve this problem today?</FieldLabel>
        <FieldHint>List every existing alternative you know of — including manual workarounds and doing nothing.</FieldHint>

        <div className="mt-3 space-y-2.5">
          {alternatives.map(alt => (
            <div
              key={alt.id}
              className="rounded-xl border border-zinc-800 bg-[#121215] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-[13.5px] font-semibold text-white">{alt.alternative_name}</h4>
                <button
                  onClick={() => removeAlternative(alt.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash size={12} />
                </button>
              </div>
              {alt.what_works && (
                <p className="text-[12px] text-zinc-400 mb-1">
                  <span className="text-emerald-400 font-semibold">Works:</span> {alt.what_works}
                </p>
              )}
              {alt.where_fails && (
                <p className="text-[12px] text-zinc-400">
                  <span className="text-orange-400 font-semibold">Fails:</span> {alt.where_fails}
                </p>
              )}
            </div>
          ))}

          {addingAlt ? (
            <div className="rounded-xl border border-zinc-700 bg-[#121215] p-4 space-y-3">
              <TextField
                autoFocus
                value={altName}
                onChange={e => setAltName(e.target.value)}
                maxLength={200}
                placeholder="Name of the alternative (e.g. Notion, spreadsheets, doing nothing)"
              />
              <TextAreaField
                value={altWorks}
                onChange={e => setAltWorks(e.target.value)}
                maxLen={400}
                rows={2}
                placeholder="What works well about it?"
              />
              <TextAreaField
                value={altFails}
                onChange={e => setAltFails(e.target.value)}
                maxLen={400}
                rows={2}
                placeholder="Where does it fail?"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={addAlternative}
                  disabled={saving || !altName.trim()}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold bg-white text-black hover:bg-zinc-100 rounded-md disabled:opacity-50"
                >
                  {saving ? <CircleNotch size={11} className="animate-spin" /> : 'Add alternative'}
                </button>
                <button
                  onClick={() => { setAddingAlt(false); setAltName(''); setAltWorks(''); setAltFails('') }}
                  className="text-[12px] text-zinc-500 hover:text-white px-2 h-8"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingAlt(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              <Plus size={12} weight="bold" /> Add another alternative
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel htmlFor="c-why-change">Why would someone consider changing their current behavior?</FieldLabel>
        <div className="mt-2">
          <TextAreaField
            id="c-why-change"
            value={profile.why_change_behavior || ''}
            maxLen={800}
            onChange={e => updateStepField(4, { why_change_behavior: e.target.value })}
            rows={4}
            placeholder="What is the trigger, urgency, or pain that makes them switch?"
          />
        </div>
      </div>

      <div className="mb-6">
        <FieldLabel>Who uses the product, who chooses it, and who pays for it?</FieldLabel>
        <FieldHint>Especially important for B2B. In B2C these can be the same person.</FieldHint>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">User</p>
            <TextField
              value={profile.user_persona || ''}
              maxLength={200}
              onChange={e => updateStepField(4, { user_persona: e.target.value })}
              placeholder="Who uses it daily"
            />
          </div>
          <div>
            <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Decision maker</p>
            <TextField
              value={profile.decision_maker || ''}
              maxLength={200}
              onChange={e => updateStepField(4, { decision_maker: e.target.value })}
              placeholder="Who chooses to adopt it"
            />
          </div>
          <div>
            <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Buyer</p>
            <TextField
              value={profile.buyer_persona || ''}
              maxLength={200}
              onChange={e => updateStepField(4, { buyer_persona: e.target.value })}
              placeholder="Who signs the check"
            />
          </div>
        </div>
      </div>

      <AssessmentStepFooter canContinue={canContinue} />
    </div>
  )
}