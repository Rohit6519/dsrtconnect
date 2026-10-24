'use client'

import { useEffect, useState } from 'react'

export function RetentionPanel({ opportunityId }: { opportunityId: string }) {
  const [policy, setPolicy] = useState<any | null>(null)

  useEffect(() => {
    // For MVP, we fetch inline (Supabase RLS filters to this opp)
    fetch(`/api/compliance/exports`).catch(() => {}) // warm session
    ;(async () => {
      // Read via generic supabase-js from client if you already have that; for now show defaults
      setPolicy({
        audit_retention_days: 2555,
        message_retention_days: 730,
        application_retention_days: 1095,
        auto_purge_enabled: false,
      })
    })()
  }, [opportunityId])

  if (!policy) return null

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
      <div className="text-[12.5px] font-bold text-white mb-3">Retention</div>
      <ul className="space-y-1.5 text-[12px] text-zinc-300">
        <li>Audit log: <span className="text-white font-semibold">{policy.audit_retention_days} days</span></li>
        <li>Messages: <span className="text-white font-semibold">{policy.message_retention_days} days</span></li>
        <li>Applications: <span className="text-white font-semibold">{policy.application_retention_days} days</span></li>
      </ul>
      <div className="text-[10.5px] text-zinc-500 mt-3">Auto-purge {policy.auto_purge_enabled ? 'enabled' : 'disabled'}. Edit policies in Settings.</div>
    </div>
  )
}