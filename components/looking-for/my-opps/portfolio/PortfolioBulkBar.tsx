'use client'

import { useState } from 'react'
import { Pause, Play, CheckCircle, Archive, Trash, X } from '@phosphor-icons/react'

export function PortfolioBulkBar({
  selectedIds,
  onClear,
  onDone,
}: {
  selectedIds: string[]
  onClear: () => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  if (selectedIds.length === 0) return null

  const run = async (action: 'pause' | 'resume' | 'close' | 'archive' | 'delete') => {
    if (action === 'delete') {
      if (!confirm(`Delete ${selectedIds.length} opportunit${selectedIds.length === 1 ? 'y' : 'ies'} permanently? This cannot be undone.`)) return
    } else if (action === 'archive' || action === 'close') {
      if (!confirm(`${action[0].toUpperCase()}${action.slice(1)} ${selectedIds.length} opportunit${selectedIds.length === 1 ? 'y' : 'ies'}?`)) return
    }

    setBusy(action)
    try {
      const res = await fetch('/api/opportunities/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed')
      onClear()
      onDone()
    } catch (e: any) {
      alert(e?.message || 'Bulk action failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur-md px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="pl-2 pr-1 text-[12px] text-zinc-300 font-semibold">
          {selectedIds.length} selected
        </div>
        <div className="h-5 w-px bg-zinc-800 mx-1" />

        <Action Icon={Pause}  label="Pause"   onClick={() => run('pause')}   busy={busy === 'pause'} />
        <Action Icon={Play}   label="Resume"  onClick={() => run('resume')}  busy={busy === 'resume'} />
        <Action Icon={CheckCircle} label="Close" onClick={() => run('close')} busy={busy === 'close'} />
        <Action Icon={Archive} label="Archive" onClick={() => run('archive')} busy={busy === 'archive'} />
        <div className="h-5 w-px bg-zinc-800 mx-1" />
        <Action Icon={Trash}  label="Delete"  onClick={() => run('delete')}  busy={busy === 'delete'} destructive />

        <div className="h-5 w-px bg-zinc-800 mx-1" />
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-zinc-400 hover:text-white"
        >
          <X size={11} weight="bold" />
          Clear
        </button>
      </div>
    </div>
  )
}

function Action({
  Icon, label, onClick, busy, destructive,
}: {
  Icon: any
  label: string
  onClick: () => void
  busy?: boolean
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-semibold transition-colors disabled:opacity-60 ' +
        (destructive
          ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
          : 'border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600')
      }
    >
      {busy ? (
        <span className="w-3 h-3 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
      ) : (
        <Icon size={12} weight="regular" />
      )}
      {label}
    </button>
  )
}