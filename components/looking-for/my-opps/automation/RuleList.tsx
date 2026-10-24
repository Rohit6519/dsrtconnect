'use client'

import { useEffect, useState } from 'react'
import { Play, PencilSimple, Pause, Trash, ChartLineUp } from '@phosphor-icons/react'
import { RuleRunLog } from './parts/RuleRunLog'

export function RuleList({ rules, onEdit, onRefresh }: {
  rules: any[] | null; onEdit: (r: any) => void; onRefresh: () => void
}) {
  const [openLog, setOpenLog] = useState<string | null>(null)

  const toggleActive = async (r: any) => {
    await fetch(`/api/automation/rules/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !r.is_active }),
    })
    onRefresh()
  }
  const remove = async (r: any) => {
    if (!confirm(`Delete rule "${r.name}"?`)) return
    await fetch(`/api/automation/rules/${r.id}`, { method: 'DELETE' })
    onRefresh()
  }

  if (rules === null) {
    return <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-zinc-900/40 animate-pulse" />)}</div>
  }
  if (rules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-[13px] text-zinc-500">
        No rules yet. Create one to automate stage moves, mail, reminders, and more.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rules.map((r: any) => (
        <div key={r.id} className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <button
              onClick={() => toggleActive(r)}
              title={r.is_active ? 'Pause' : 'Enable'}
              className={
                'w-9 h-9 rounded-lg border flex items-center justify-center ' +
                (r.is_active
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-500')
              }
            >
              {r.is_active ? <Play size={12} weight="fill" /> : <Pause size={12} weight="fill" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-[13.5px] font-bold text-white truncate">{r.name}</div>
                {r.is_template && (
                  <span className="inline-flex items-center h-5 px-2 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                    Template
                  </span>
                )}
                <span className="inline-flex items-center h-5 px-2 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
                  {r.trigger_type}
                </span>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <ChartLineUp size={10} /> {r.runs_total || 0} runs · {r.runs_success || 0} ok · {r.runs_failed || 0} fail
                </span>
              </div>
              {r.description && <div className="text-[11.5px] text-zinc-500 mt-1">{r.description}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setOpenLog(openLog === r.id ? null : r.id)}
                className="h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-300 hover:text-white">
                Runs
              </button>
              <button onClick={() => onEdit(r)}
                className="h-8 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-[12px] font-bold inline-flex items-center gap-1.5">
                <PencilSimple size={11} weight="bold" /> Edit
              </button>
              {!r.is_system && (
                <button onClick={() => remove(r)}
                  className="w-8 h-8 rounded-lg border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-300 flex items-center justify-center">
                  <Trash size={12} />
                </button>
              )}
            </div>
          </div>
          {openLog === r.id && (
            <div className="border-t border-zinc-800/80 p-4 bg-zinc-950/40">
              <RuleRunLog ruleId={r.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}