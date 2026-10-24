'use client'

import { useState } from 'react'
import { DrawerShell } from '@/components/looking-for/my-opps/command-center/parts/DrawerShell'
import { Plus, X, CircleNotch } from '@phosphor-icons/react'

interface Slot { date: string; start: string; end: string }

export function AvailabilityDrawer({
  applicationId, existing, onClose, onSaved,
}: {
  applicationId: string
  existing: any[]
  onClose: () => void
  onSaved: () => void
}) {
  const [slots, setSlots] = useState<Slot[]>([{ date: '', start: '', end: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = () => setSlots([...slots, { date: '', start: '', end: '' }])
  const remove = (i: number) => setSlots(slots.filter((_, idx) => idx !== i))
  const update = (i: number, k: keyof Slot, v: string) => {
    const next = [...slots]; next[i] = { ...next[i], [k]: v }; setSlots(next)
  }

  const save = async () => {
    setError(null)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const payload = slots
      .filter(s => s.date && s.start && s.end)
      .map(s => ({
        start_at: new Date(`${s.date}T${s.start}`).toISOString(),
        end_at:   new Date(`${s.date}T${s.end}`).toISOString(),
        timezone: tz,
      }))
      .filter(s => new Date(s.end_at).getTime() > new Date(s.start_at).getTime())
    if (payload.length === 0) {
      setError('Add at least one valid time window.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: payload }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d?.error || 'Failed')
      onSaved()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DrawerShell
      open
      onClose={busy ? () => {} : onClose}
      title="Share your availability"
      subtitle="The team will pick from your proposed windows and confirm."
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500">All times use your local timezone.</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={busy}
              className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white disabled:opacity-50">
              Cancel
            </button>
            <button onClick={save} disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold disabled:opacity-60">
              {busy ? <CircleNotch size={13} className="animate-spin" /> : null}
              Save availability
            </button>
          </div>
        </div>
      }
    >
      {existing && existing.length > 0 && (
        <div className="mb-5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Already shared</div>
          <ul className="space-y-1.5 text-[12.5px] text-zinc-300">
            {existing.map((s: any) => (
              <li key={s.id}>
                {new Date(s.start_at).toLocaleString()} → {new Date(s.end_at).toLocaleTimeString()}
                <span className="text-[10.5px] text-zinc-500 ml-2 uppercase">{s.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {slots.map((s, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <input type="date" value={s.date} onChange={(e) => update(i, 'date', e.target.value)}
              className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
            <input type="time" value={s.start} onChange={(e) => update(i, 'start', e.target.value)}
              className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
            <input type="time" value={s.end} onChange={(e) => update(i, 'end', e.target.value)}
              className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white focus:outline-none focus:border-zinc-700" />
            <button onClick={() => remove(i)}
              className="w-10 h-10 rounded-lg border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-300 flex items-center justify-center">
              <X size={13} weight="bold" />
            </button>
          </div>
        ))}
        <button onClick={add}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[12.5px] text-zinc-300 hover:text-white">
          <Plus size={12} weight="bold" /> Add another window
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-[12.5px] text-red-300">
          {error}
        </div>
      )}
    </DrawerShell>
  )
}