'use client'

import { useCallback, useEffect, useState } from 'react'
import { CircleNotch, Download, Plus } from '@phosphor-icons/react'

export function ExportsPanel({ opportunityId }: { opportunityId: string }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/compliance/exports')
    const d = await res.json()
    setItems(d.requests || [])
  }, [])
  useEffect(() => { load() }, [load])

  const request = async (format: 'json' | 'csv') => {
    setBusy(true)
    try {
      const res = await fetch('/api/compliance/exports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'opportunity', entity_id: opportunityId, format,
          include_pii: true, include_audit: true, include_messages: true,
        }),
      })
      if (res.ok) load()
    } finally { setBusy(false) }
  }

  const download = async (id: string) => {
    const res = await fetch(`/api/compliance/exports/${id}/download`)
    const d = await res.json()
    if (d.url) window.open(d.url, '_blank')
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden">
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div>
          <div className="text-[12.5px] font-bold text-white">Data exports</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Legal / GDPR-ready bundles.</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => request('json')} disabled={busy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-300 hover:text-white">
            <Plus size={10} weight="bold" /> JSON
          </button>
          <button onClick={() => request('csv')} disabled={busy}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[11.5px] font-semibold text-zinc-300 hover:text-white">
            <Plus size={10} weight="bold" /> CSV
          </button>
        </div>
      </div>
      <div className="p-3 max-h-[360px] overflow-y-auto">
        {items === null ? (
          <div className="flex items-center gap-2 text-[12px] text-zinc-500 p-2"><CircleNotch size={12} className="animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-[12.5px] text-zinc-500 p-2">No exports requested yet.</div>
        ) : (
          <ul className="space-y-2">
            {items.map(r => (
              <li key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">{r.format}</span>
                  <span className={
                    'text-[10.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ' +
                    (r.status === 'ready'   ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' :
                     r.status === 'failed'  ? 'border-red-500/30 bg-red-500/10 text-red-300' :
                                              'border-zinc-800 bg-zinc-900 text-zinc-400')
                  }>{r.status}</span>
                  <span className="text-[11px] text-zinc-500">{new Date(r.requested_at).toLocaleString()}</span>
                </div>
                {r.error && <div className="text-[11px] text-red-300 mt-1">{r.error}</div>}
                {r.status === 'ready' && (
                  <button onClick={() => download(r.id)}
                    className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-[11.5px] font-bold">
                    <Download size={11} weight="bold" /> Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}