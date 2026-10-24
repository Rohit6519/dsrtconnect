'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash, ArrowUp, ArrowDown, LockSimple } from '@phosphor-icons/react'

const CORE = new Set([
  'submitted',
  'under-review',
  'shortlisted',
  'interview',
  'offer',
  'accepted',
  'declined',
  'withdrawn',
])

export function PipelineStagesCard({ opportunityId }: { opportunityId: string }) {
  const [stages, setStages] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKey, setNewKey] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/opportunities/${opportunityId}/stages`)
    const d = await res.json()
    setStages(d.stages || [])
  }, [opportunityId])

  useEffect(() => {
    load()
  }, [load])

  const rename = async (id: string, name: string) => {
    setBusy(id)
    try {
      await fetch(`/api/opportunities/${opportunityId}/stages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ id, name }] }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    if (!stages) return
    const j = index + dir
    if (j < 0 || j >= stages.length) return
    const a = stages[index]
    const b = stages[j]
    setBusy(a.id)
    try {
      await fetch(`/api/opportunities/${opportunityId}/stages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            { id: a.id, order_index: b.order_index },
            { id: b.id, order_index: a.order_index },
          ],
        }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const remove = async (s: any) => {
    if (CORE.has(s.stage_key)) return
    if (!confirm(`Delete stage "${s.name}"?`)) return
    setBusy(s.id)
    try {
      const res = await fetch(
        `/api/opportunities/${opportunityId}/stages?stage_id=${s.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error || 'Failed')
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const add = async () => {
    const name = newName.trim()
    const key = (newKey || newName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-')
    if (!name || !key) return
    const nextOrder =
      (stages || []).reduce((m, s) => Math.max(m, s.order_index || 0), 0) + 1
    const res = await fetch(`/api/opportunities/${opportunityId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage_key: key,
        name,
        order_index: nextOrder,
        category: 'progress',
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j?.error || 'Failed')
    } else {
      setNewName('')
      setNewKey('')
      setAdding(false)
      await load()
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-white">Pipeline stages</h3>
          <p className="text-[11.5px] text-zinc-500 mt-0.5">
            Rename, reorder or add custom stages. Core stages can be renamed but
            not deleted.
          </p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-300 hover:text-white"
        >
          <Plus size={12} weight="bold" />
          Add stage
        </button>
      </div>

      {adding && (
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/30 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Display name (e.g. Take-home)"
            className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
          />
          <input
            value={newKey}
            onChange={(e) =>
              setNewKey(e.target.value.replace(/[^a-z0-9\-]/g, '-').toLowerCase())
            }
            placeholder="key-slug (auto if empty)"
            className="h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 font-mono"
          />
          <div className="flex gap-2 md:justify-end">
            <button
              onClick={() => {
                setAdding(false)
                setNewName('')
                setNewKey('')
              }}
              className="h-10 px-3 rounded-xl border border-zinc-800 text-[12.5px] text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={add}
              className="h-10 px-4 rounded-xl bg-white text-black text-[12.5px] font-bold hover:bg-zinc-100"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {stages === null ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-zinc-900/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {stages.map((s: any, i: number) => {
            const isCore = CORE.has(s.stage_key)
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={busy === s.id || i === 0}
                    className="w-6 h-6 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <ArrowUp size={10} weight="bold" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={busy === s.id || i === stages.length - 1}
                    className="w-6 h-6 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center disabled:opacity-40"
                  >
                    <ArrowDown size={10} weight="bold" />
                  </button>
                </div>

                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <StageName
                    initial={s.name}
                    disabled={busy === s.id}
                    onSave={(v) => v !== s.name && rename(s.id, v)}
                  />
                  <span className="text-[10.5px] font-mono text-zinc-500">
                    {s.stage_key}
                  </span>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                    {s.category}
                  </span>
                  {isCore && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
                      <LockSimple size={10} /> Core
                    </span>
                  )}
                </div>

                <button
                  onClick={() => remove(s)}
                  disabled={isCore || busy === s.id}
                  className={
                    'inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold ' +
                    (isCore
                      ? 'border border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'border border-red-500/25 text-red-300 hover:bg-red-500/10')
                  }
                >
                  <Trash size={11} />
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StageName({
  initial,
  onSave,
  disabled,
}: {
  initial: string
  onSave: (v: string) => void
  disabled?: boolean
}) {
  const [v, setV] = useState(initial)
  useEffect(() => setV(initial), [initial])
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && onSave(v.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      disabled={disabled}
      className="h-8 px-2 rounded-lg bg-transparent border border-transparent hover:border-zinc-800 focus:border-zinc-700 focus:bg-zinc-950 text-[13px] text-white font-semibold w-[220px] focus:outline-none"
    />
  )
}