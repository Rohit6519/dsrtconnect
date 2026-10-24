'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Robot } from '@phosphor-icons/react'
import { RuleList } from '@/components/looking-for/my-opps/automation/RuleList'
import { RuleBuilder } from '@/components/looking-for/my-opps/automation/RuleBuilder'

export function AutomationTab({ opportunityId }: { opportunityId: string }) {
  const [rules, setRules] = useState<any[] | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/automation/rules?opportunity_id=${opportunityId}`)
    const d = await res.json()
    setRules(d.rules || [])
  }, [opportunityId])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
          <Robot size={16} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-bold text-white">Automation rules</div>
          <div className="text-[11.5px] text-zinc-500 mt-0.5">
            Every rule listens for a trigger, checks optional conditions, then runs actions — with delays between them.
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 text-[12.5px] font-bold"
        >
          <Plus size={12} weight="bold" /> New rule
        </button>
      </div>

      <RuleList rules={rules} onEdit={(r) => setEditing(r)} onRefresh={load} />

      {(creating || editing) && (
        <RuleBuilder
          opportunityId={opportunityId}
          rule={editing || null}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}