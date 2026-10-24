// filepath: components/looking-for/studio/steps/ApplicationStep.tsx
'use client'

import { useCallback, useState } from 'react'
import { StepFooter } from './StepFooter'
import { useStudio } from '../StudioContext'
import { AddQuestionMenu } from './parts/AddQuestionMenu'
import { QuestionCard } from './parts/QuestionCard'
import { DefaultAttachmentsCard } from './parts/DefaultAttachmentsCard'
import { AntiSpamCard } from './parts/AntiSpamCard'
import { TipBox } from './parts/TipBox'
import { DEFAULT_LABELS, QUESTION_TYPE_META, type QuestionType } from './parts/questionTypes'

export function ApplicationStep() {
  const { draft, setDraft } = useStudio()
  const oppId = draft.opportunity.id
  const questions = (draft.application_questions || []).slice().sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const refreshQuestions = useCallback(async () => {
    const res = await fetch(`/api/opportunities/drafts/${oppId}/questions`)
    const d = await res.json()
    if (res.ok) setDraft((prev) => prev ? { ...prev, application_questions: d.questions || [] } : prev)
  }, [oppId, setDraft])

  const addQuestion = async (type: QuestionType) => {
    setAdding(true)
    try {
      const hasOptions = QUESTION_TYPE_META[type].hasOptions
      const body: any = { question_type: type, label: DEFAULT_LABELS[type], is_required: type === 'long_text', configuration: {} }
      if (hasOptions) body.options = [{ label: 'Option A', value: 'option_a' }, { label: 'Option B', value: 'option_b' }]
      const res = await fetch(`/api/opportunities/drafts/${oppId}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Failed to add question')
      setDraft((prev) => prev ? { ...prev, application_questions: [...(prev.application_questions || []), d.question] } : prev)
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setAdding(false)
    }
  }

  const updatePatch = async (questionId: string, patch: Record<string, any>) => {
    setBusyId(questionId)
    setDraft((prev) => prev ? { ...prev, application_questions: prev.application_questions.map((q: any) => q.id === questionId ? { ...q, ...patch } : q) } : prev)
    try {
      const res = await fetch(`/api/opportunities/drafts/${oppId}/questions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: questionId, patch }) })
      const d = await res.json()
      if (res.ok && d.question) setDraft((prev) => prev ? { ...prev, application_questions: prev.application_questions.map((q: any) => (q.id === questionId ? d.question : q)) } : prev)
    } catch {
      await refreshQuestions()
    } finally {
      setBusyId(null)
    }
  }

  const updateOptions = async (questionId: string, options: { label: string; value: string }[]) => {
    setBusyId(questionId)
    try {
      await fetch(`/api/opportunities/drafts/${oppId}/questions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: questionId, options }) })
      await refreshQuestions()
    } finally {
      setBusyId(null)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= questions.length) return
    const a = questions[index]; const b = questions[j]
    setDraft((prev) => {
      if (!prev) return prev
      const list = (prev.application_questions || []).slice()
      const ia = list.findIndex((q: any) => q.id === a.id)
      const ib = list.findIndex((q: any) => q.id === b.id)
      if (ia < 0 || ib < 0) return prev
      const tmpOrder = list[ia].order_index
      list[ia] = { ...list[ia], order_index: list[ib].order_index }
      list[ib] = { ...list[ib], order_index: tmpOrder }
      return { ...prev, application_questions: list }
    })
    setBusyId(a.id)
    try {
      await fetch(`/api/opportunities/drafts/${oppId}/questions`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reorder: [{ id: a.id, order_index: b.order_index }, { id: b.id, order_index: a.order_index }] }) })
    } finally {
      setBusyId(null); await refreshQuestions()
    }
  }

  const remove = async (questionId: string) => {
    if (!confirm('Delete this question?')) return
    setBusyId(questionId)
    const prev = questions
    setDraft((p) => p ? { ...p, application_questions: p.application_questions.filter((q: any) => q.id !== questionId) } : p)
    try {
      await fetch(`/api/opportunities/drafts/${oppId}/questions?question_id=${questionId}`, { method: 'DELETE' })
    } catch {
      setDraft((p) => p ? { ...p, application_questions: prev } : p)
    } finally {
      setBusyId(null)
    }
  }

  const requiredCount = questions.filter((q: any) => q.is_required).length

  return (
    <>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
        <div className="space-y-5 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-[22px] font-bold text-white mb-1 tracking-tight">Application</h2>
              <p className="text-[13px] text-white/50">Design what applicants need to submit.</p>
            </div>
            <AddQuestionMenu onSelect={addQuestion} disabled={adding} />
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] p-10 text-center bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="text-[14px] font-bold text-white mb-1">No custom questions yet</div>
              <div className="text-[12.5px] text-white/45 mb-4 max-w-md mx-auto">Applicants will still use default requirements you enable below.</div>
              <AddQuestionMenu onSelect={addQuestion} disabled={adding} />
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q: any, i: number) => (
                <QuestionCard key={q.id} question={q} allQuestions={questions} index={i} total={questions.length} saving={busyId === q.id} onUpdatePatch={(patch) => updatePatch(q.id, patch)} onUpdateOptions={(opts) => updateOptions(q.id, opts)} onMove={(dir) => move(i, dir)} onRemove={() => remove(q.id)} />
              ))}
            </div>
          )}

          <DefaultAttachmentsCard />
          <AntiSpamCard />
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-[130px] space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#141821] via-[#101319] to-[#0B0D13] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.3)]">
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#FBBF24] mb-4">Application summary</h3>
              <Row label="Custom questions" value={questions.length} />
              <Row label="Required" value={requiredCount} />
              <div className="my-3 border-t border-white/[0.06]" />
              <Row label="Cover letter" value={draft.opportunity.require_cover_letter ? 'On' : 'Off'} />
              <Row label="Resume" value={draft.opportunity.require_resume ? 'On' : 'Off'} />
              <Row label="Portfolio" value={draft.opportunity.require_portfolio ? 'On' : 'Off'} />
              <Row label="Max applications" value={draft.opportunity.max_applications || 'Unlimited'} />
            </div>

            <TipBox variant="tips" title="Application Tips" items={[
              { title: 'Keep questions short', desc: '2–4 custom questions gets the highest completion rate.' },
              { title: 'Ask for portfolios', desc: 'Requiring a portfolio filters out unqualified applicants automatically.' },
            ]} />
          </div>
        </div>
      </div>
      <StepFooter prev="requirements" next="workflow" />
    </>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-[12px]">
      <span className="text-white/45">{label}</span>
      <span className="text-white/85 font-semibold">{String(value)}</span>
    </div>
  )
}