'use client'
import { useEffect, useState } from 'react'
import { StepChip } from './StepChip'

export function RuleRunLog({ ruleId }: { ruleId: string }) {
  const [runs, setRuns] = useState<any[] | null>(null)
  useEffect(() => {
    fetch(`/api/automation/rules/${ruleId}/runs`).then(r => r.json()).then(d => setRuns(d.runs || []))
  }, [ruleId])

  if (!runs) return <div className="text-[12.5px] text-zinc-500">Loading runs…</div>
  if (runs.length === 0) return <div className="text-[12.5px] text-zinc-500">No runs yet.</div>

  return (
    <div className="space-y-3">
      {runs.map((r: any) => {
        const toneMap: any = { completed: 'emerald', running: 'blue', skipped: 'zinc', failed: 'red', cancelled: 'amber' }
        return (
          <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="flex items-center gap-2">
              <StepChip label={r.status} tone={toneMap[r.status] || 'zinc'} />
              <span className="text-[11.5px] text-zinc-400">{new Date(r.started_at).toLocaleString()}</span>
              {r.error && <span className="text-[11px] text-red-300 truncate">· {r.error}</span>}
            </div>
            <div className="mt-2 space-y-1">
              {(r.steps || []).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-[11.5px]">
                  <StepChip label={s.step_kind} />
                  <span className="text-zinc-400 font-mono">{s.step_key}</span>
                  <StepChip label={s.status} tone={s.status === 'done' ? 'emerald' : s.status === 'failed' ? 'red' : 'zinc'} />
                  {s.error && <span className="text-red-300 truncate">{s.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}