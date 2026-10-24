'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trash, Copy, CheckCircle } from '@phosphor-icons/react'
import { DestinationPicker } from './distribution/DestinationPicker'

const CORE_SURFACES = [
  { type: 'looking_for', label: 'Looking For (Explore)', hint: 'Show on the main Looking For discovery feed.' },
  { type: 'search', label: 'Search', hint: 'Include in global platform search results.' },
  { type: 'recommendations', label: 'Personalized Recommendations', hint: 'Allow the recommender to surface this opportunity.' },
]

export function DistributionTab({ opportunityId }: { opportunityId: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/opportunities/${opportunityId}/distribution`)
    const d = await res.json()
    setRows(d.distribution || [])
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  const has = (t: string) => (rows || []).some((r: any) => r.destination_type === t && !r.destination_id && r.status === 'active')
  const rowFor = (t: string) => (rows || []).find((r: any) => r.destination_type === t && !r.destination_id)

  const toggle = async (t: string) => {
    setBusy(t)
    try {
      if (has(t)) {
        const r = rowFor(t)
        if (r) {
          await fetch(`/api/opportunities/${opportunityId}/distribution?distribution_id=${r.id}`, { method: 'DELETE' })
        }
      } else {
        await fetch(`/api/opportunities/${opportunityId}/distribution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination_type: t }),
        })
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  const addSpecific = async (type: string, id: string) => {
    setBusy('add')
    try {
      await fetch(`/api/opportunities/${opportunityId}/distribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_type: type, destination_id: id }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const removeSpecific = async (distId: string) => {
    setBusy(distId)
    try {
      await fetch(`/api/opportunities/${opportunityId}/distribution?distribution_id=${distId}`, { method: 'DELETE' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/looking-for/${opportunityId}`
    : ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5">
        <h2 className="text-[13px] font-bold text-white">Public link</h2>
        <p className="text-[11.5px] text-zinc-500 mt-0.5">Anyone with the link can view the public opportunity page (subject to your visibility settings).</p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly value={publicUrl} className="flex-1 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200" />
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-semibold text-zinc-300 hover:text-white"
          >
            {copied ? <><CheckCircle size={12} weight="fill" className="text-emerald-400" /> Copied</> : <><Copy size={12} weight="regular" /> Copy</>}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80">
          <h2 className="text-[13px] font-bold text-white">Surfaces</h2>
          <p className="text-[11.5px] text-zinc-500 mt-0.5">Choose where this opportunity is allowed to appear on DSRT.</p>
        </div>
        {rows === null ? (
          <div className="p-6 space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-12 rounded-lg bg-zinc-900/40 animate-pulse" />)}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/70">
            {CORE_SURFACES.map(s => {
              const active = has(s.type)
              return (
                <li key={s.type} className="flex items-start gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white">{s.label}</div>
                    <div className="text-[11.5px] text-zinc-500 mt-0.5">{s.hint}</div>
                  </div>
                  <Toggle value={active} disabled={busy === s.type} onToggle={() => toggle(s.type)} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-bold text-white">Targeted Distribution</h2>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">Attach this opportunity directly to specific communities, projects or ventures.</p>
          </div>
          <DestinationPicker onSelect={addSpecific} disabled={busy === 'add' || rows === null} />
        </div>
        
        <div className="divide-y divide-zinc-800/70">
          {(rows || []).filter((r: any) => r.destination_id).length === 0 ? (
            <div className="px-5 py-6 text-center text-[12px] text-zinc-500">Not distributed to any specific targets yet.</div>
          ) : (
            (rows || []).filter((r: any) => r.destination_id).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-white capitalize">{String(r.destination_type).replace(/_/g, ' ')}</div>
                  <div className="text-[10.5px] font-mono text-zinc-500">{r.destination_id}</div>
                </div>
                <button
                  onClick={() => removeSpecific(r.id)}
                  disabled={busy === r.id}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition-colors disabled:opacity-50"
                >
                  <Trash size={11} /> Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={
        'relative w-10 h-6 rounded-full transition-colors ' +
        (value ? 'bg-white' : 'bg-zinc-800')
      }
      aria-pressed={value}
    >
      <span
        className={
          'absolute top-0.5 w-5 h-5 rounded-full transition-all ' +
          (value ? 'left-4 bg-black' : 'left-0.5 bg-zinc-500')
        }
      />
    </button>
  )
}