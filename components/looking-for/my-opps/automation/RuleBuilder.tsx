'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, FloppyDisk, Plus, X, ArrowDown } from '@phosphor-icons/react'
import { DrawerShell } from '@/components/looking-for/my-opps/command-center/parts/DrawerShell'
import { TriggerPicker } from './parts/TriggerPicker'
import { ConditionEditor } from './parts/ConditionEditor'
import { ActionEditor } from './parts/ActionEditor'
import { DelayEditor } from './parts/DelayEditor'

export function RuleBuilder({ opportunityId, rule, onClose, onSaved }: {
  opportunityId: string
  rule: any | null
  onClose: () => void
  onSaved: () => void
}) {
  const [registry, setRegistry] = useState<any | null>(null)
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [trigger, setTrigger] = useState<{ key: string; config: any }>({
    key: rule?.trigger_type || 'application_submitted',
    config: rule?.trigger_config || {},
  })
  const [steps, setSteps] = useState<any[]>(rule?.steps || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/automation/registry').then(r => r.json()).then(setRegistry)
  }, [])

  const addStep = (kind: 'condition' | 'action' | 'delay') => {
    const defaults: Record<string, any> = { condition: 'stage_equals', action: 'send_candidate_mail', delay: 'wait' }
    setSteps([...steps, { kind, key: defaults[kind], config: {} }])
  }
  const updateStep = (i: number, patch: any) => {
    const next = [...steps]; next[i] = { ...next[i], ...patch }; setSteps(next)
  }
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))

  const save = async () => {
    setError(null); setBusy(true)
    try {
      const url = rule ? `/api/automation/rules/${rule.id}` : '/api/automation/rules'
      const method = rule ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_id: opportunityId,
          name, description,
          trigger_type: trigger.key,
          trigger_config: trigger.config,
          steps,
          is_active: rule?.is_active ?? true,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Save failed')
      onSaved()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally { setBusy(false) }
  }

  return (
    <DrawerShell
      open
      onClose={busy ? () => {} : onClose}
      title={rule ? 'Edit rule' : 'New automation rule'}
      subtitle="Trigger → Conditions → Actions → Delays. Every step runs in order."
      wide
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={busy}
            className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={busy || !name.trim() || steps.length === 0}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold disabled:opacity-60">
            {busy ? <CircleNotch size={13} className="animate-spin" /> : <FloppyDisk size={13} weight="bold" />}
            Save rule
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Auto-shortlist verified applicants"
            className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-white focus:outline-none focus:border-zinc-700" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Description (optional)</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 resize-y" />
        </div>

        {/* Trigger */}
        <div>
          <StepBanner index={0} kind="trigger" />
          <TriggerPicker
            registry={registry}
            value={trigger}
            onChange={setTrigger}
          />
        </div>

        {/* Steps */}
        {steps.map((s, i) => (
          <div key={i}>
            <div className="flex justify-center py-1"><ArrowDown size={13} className="text-zinc-700" /></div>
            <StepBanner index={i + 1} kind={s.kind} onRemove={() => removeStep(i)} />
            {s.kind === 'condition' && (
                <ConditionEditor registry={registry} value={s} onChange={(v: any) => updateStep(i, v)} />
            )}
            {s.kind === 'action' && (
                <ActionEditor registry={registry} value={s} onChange={(v: any) => updateStep(i, v)} />
            )}
            {s.kind === 'delay' && (
                <DelayEditor registry={registry} value={s} onChange={(v: any) => updateStep(i, v)} />
            )}
          </div>
        ))}

        {/* Add-step buttons */}
        <div className="pt-2 flex items-center gap-2 justify-center">
          {(['condition', 'action', 'delay'] as const).map(k => (
            <button key={k} type="button" onClick={() => addStep(k)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-semibold text-zinc-300 hover:text-white capitalize">
              <Plus size={11} weight="bold" /> {k}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-[12.5px] text-red-300">{error}</div>
        )}
      </div>
    </DrawerShell>
  )
}

function StepBanner({ index, kind, onRemove }: { index: number; kind: string; onRemove?: () => void }) {
  const label = kind === 'trigger' ? 'Trigger' : kind.charAt(0).toUpperCase() + kind.slice(1)
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-zinc-500">
        <span className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center text-[10px]">{index + 1}</span>
        {label}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove}
          className="w-7 h-7 rounded-md border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-300 flex items-center justify-center">
          <X size={11} weight="bold" />
        </button>
      )}
    </div>
  )
}