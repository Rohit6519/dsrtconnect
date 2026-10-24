'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Trash, CircleNotch, Check, CalendarBlank, Star, ArrowRight
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  slug: string
}

interface Milestone {
  id: string
  title: string
  description?: string | null
  target_date?: string | null
  success_criteria?: string | null
  status: string
  is_primary?: boolean
  completed_at?: string | null
}

export function MilestonesTimeline({ slug }: Props) {
  const [items, setItems] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [target, setTarget] = useState('')
  const [criteria, setCriteria] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/milestones`)
      const json = await res.json()
      setItems(json.milestones || [])
    } catch {
      toast.error('Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { load() }, [load])

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
      await load()
      toast.success('Milestone added')
    } catch {
      toast.error('Could not add milestone')
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/ventures/${slug}/assessment/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      toast.error('Could not update milestone')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this milestone?')) return
    try {
      await fetch(`/api/ventures/${slug}/assessment/milestones/${id}`, { method: 'DELETE' })
      await load()
    } catch {
      toast.error('Could not remove')
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-8 flex items-center justify-center gap-2 text-[13px] text-zinc-400">
        <CircleNotch size={16} className="animate-spin" /> Loading milestones…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white">Milestones</h2>
          <p className="text-[12.5px] text-zinc-400 mt-1 max-w-xl">
            Track execution. Every completed milestone becomes part of your public build record.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white text-black text-[12px] font-semibold hover:bg-zinc-100"
          >
            <Plus size={12} weight="bold" /> Add milestone
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121215]/60 p-8 text-center">
          <p className="text-[13px] text-zinc-400">No milestones yet.</p>
          <p className="text-[12px] text-zinc-500 mt-1">Define the next concrete outcome you will prove.</p>
        </div>
      )}

      <div className="relative space-y-0">
        {items.map((m, idx) => {
          const done = m.status === 'completed'
          const active = m.status === 'in_progress' || m.status === 'active'
          return (
            <div key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline rail */}
              <div className="flex flex-col items-center w-6 flex-shrink-0">
                <div
                  className={
                    'w-6 h-6 rounded-full border flex items-center justify-center z-10 ' +
                    (done
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : active
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500')
                  }
                >
                  {done ? <Check size={11} weight="bold" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                </div>
                {idx < items.length - 1 && (
                  <div className="w-px flex-1 bg-zinc-800 mt-1" />
                )}
              </div>

              <div className="flex-1 min-w-0 rounded-2xl border border-zinc-800 bg-[#121215] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.is_primary && <Star size={12} weight="fill" className="text-amber-400" />}
                      <h4 className="text-[14px] font-bold text-white">{m.title}</h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-[12.5px] text-zinc-400 mt-1.5 leading-relaxed">{m.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 flex-wrap">
                      {m.target_date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarBlank size={11} />
                          {new Date(m.target_date).toLocaleDateString('en', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </span>
                      )}
                      {m.success_criteria && (
                        <span>
                          <span className="text-zinc-600">Success:</span> {m.success_criteria}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => remove(m.id)} className="text-zinc-500 hover:text-red-400 flex-shrink-0">
                    <Trash size={13} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800/80">
                  {[
                    { value: 'active', label: 'Active' },
                    { value: 'in_progress', label: 'In progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'abandoned', label: 'Abandoned' },
                  ].map(s => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(m.id, s.value)}
                      disabled={m.status === s.value}
                      className={
                        'h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors ' +
                        (m.status === s.value
                          ? 'bg-white text-black'
                          : 'bg-white/[0.04] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="rounded-2xl border border-zinc-700 bg-[#121215] p-4 space-y-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Milestone title"
            className="w-full h-10 px-3 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13.5px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Target date</p>
              <input
                type="date"
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13.5px] text-white focus:outline-none"
              />
            </div>
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1.5">Success criteria</p>
              <input
                value={criteria}
                onChange={e => setCriteria(e.target.value)}
                maxLength={300}
                placeholder="How you'll know it's done"
                className="w-full h-10 px-3 rounded-lg bg-[#0a0a0f] border border-zinc-800 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={add}
              disabled={saving || title.trim().length < 3}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white text-black text-[12px] font-semibold disabled:opacity-50"
            >
              {saving ? <CircleNotch size={11} className="animate-spin" /> : <>Add <ArrowRight size={11} weight="bold" /></>}
            </button>
            <button
              onClick={() => { setAdding(false); setTitle(''); setDesc(''); setTarget(''); setCriteria('') }}
              className="h-8 px-2 text-[12px] text-zinc-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}