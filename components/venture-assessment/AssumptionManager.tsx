'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Trash, CircleNotch, Check, Flask, X, Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  slug: string
}

type Status = 'active' | 'testing' | 'validated' | 'invalidated' | 'archived'

interface Assumption {
  id: string
  assumption_text: string
  confidence: string
  belief_rationale?: string | null
  test_plan?: string | null
  status: Status
  validated_at?: string | null
}

const STATUS_FLOW: { value: Status; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'testing', label: 'Testing' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalidated', label: 'Invalidated' },
  { value: 'archived', label: 'Archived' },
]

export function AssumptionManager({ slug }: Props) {
  const [items, setItems] = useState<Assumption[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState('medium')
  const [rationale, setRationale] = useState('')
  const [testPlan, setTestPlan] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/assumptions`)
      const json = await res.json()
      setItems(json.assumptions || [])
    } catch {
      toast.error('Failed to load assumptions')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

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
      await load()
      toast.success('Assumption added')
    } catch {
      toast.error('Could not add assumption')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: Status) => {
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/assumptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      toast.error('Could not update status')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this assumption?')) return
    try {
      await fetch(`/api/ventures/${slug}/assessment/assumptions/${id}`, { method: 'DELETE' })
      await load()
    } catch {
      toast.error('Could not remove')
    }
  }

  const confStyle = (c: string) => {
    if (c === 'high') return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
    if (c === 'medium') return 'text-amber-300 bg-amber-500/10 border-amber-500/25'
    return 'text-red-300 bg-red-500/10 border-red-500/25'
  }

  const statusStyle = (s: Status) => {
    if (s === 'validated') return 'text-emerald-300'
    if (s === 'testing') return 'text-sky-300'
    if (s === 'invalidated') return 'text-orange-300'
    if (s === 'archived') return 'text-zinc-500'
    return 'text-zinc-300'
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-8 flex items-center justify-center gap-2 text-[13px] text-zinc-400">
        <CircleNotch size={16} className="animate-spin" /> Loading assumptions…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white">Assumptions</h2>
          <p className="text-[12.5px] text-zinc-400 mt-1 max-w-xl">
            Track what you are betting on. Move each assumption through testing → validated or invalidated.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white text-black text-[12px] font-semibold hover:bg-zinc-100"
          >
            <Plus size={12} weight="bold" /> Add assumption
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121215]/60 p-8 text-center">
          <Warning size={22} className="text-zinc-500 mx-auto mb-2" />
          <p className="text-[13px] text-zinc-400">No assumptions yet.</p>
          <p className="text-[12px] text-zinc-500 mt-1">Add the critical bets your venture depends on.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {items.map(a => (
          <div key={a.id} className="rounded-2xl border border-zinc-800 bg-[#121215] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-white leading-snug">{a.assumption_text}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${confStyle(a.confidence)}`}>
                    {a.confidence}
                  </span>
                  <span className={`text-[11px] font-semibold capitalize ${statusStyle(a.status)}`}>
                    {a.status}
                  </span>
                </div>
                {a.belief_rationale && (
                  <p className="text-[12px] text-zinc-400 mt-2">
                    <span className="text-zinc-500 font-semibold">Why:</span> {a.belief_rationale}
                  </p>
                )}
                {a.test_plan && (
                  <p className="text-[12px] text-zinc-400 mt-1">
                    <span className="text-zinc-500 font-semibold">Test:</span> {a.test_plan}
                  </p>
                )}
              </div>
              <button onClick={() => remove(a.id)} className="text-zinc-500 hover:text-red-400 flex-shrink-0">
                <Trash size={13} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800/80">
              {STATUS_FLOW.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatus(a.id, s.value)}
                  disabled={a.status === s.value}
                  className={
                    'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors ' +
                    (a.status === s.value
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
                  }
                >
                  {s.value === 'testing' && <Flask size={10} />}
                  {s.value === 'validated' && <Check size={10} weight="bold" />}
                  {s.value === 'invalidated' && <X size={10} weight="bold" />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {adding && (
          <div className="rounded-2xl border border-zinc-700 bg-[#121215] p-4 space-y-3">
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Customers will pay for this within 14 days of trial."
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13.5px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={confidence}
                onChange={e => setConfidence(e.target.value)}
                className="h-9 px-2 rounded-md bg-[#0a0a0f] border border-zinc-800 text-[12px] text-white focus:outline-none"
              >
                <option value="low">Low confidence</option>
                <option value="medium">Medium confidence</option>
                <option value="high">High confidence</option>
              </select>
            </div>
            <textarea
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              rows={2}
              placeholder="Why do you believe this?"
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <textarea
              value={testPlan}
              onChange={e => setTestPlan(e.target.value)}
              rows={2}
              placeholder="How will you test it?"
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={add}
                disabled={saving || text.trim().length < 5}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white text-black text-[12px] font-semibold disabled:opacity-50"
              >
                {saving ? <CircleNotch size={11} className="animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => { setAdding(false); setText(''); setRationale(''); setTestPlan('') }}
                className="h-8 px-2 text-[12px] text-zinc-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}