'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldWarning, CircleNotch } from '@phosphor-icons/react'

export function IntegrityBadge() {
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<boolean | null>(null)
  const [detail, setDetail] = useState<string>('Not yet verified')

  const verify = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/compliance/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 2000 }) })
      const d = await res.json()
      setOk(d.ok)
      setDetail(d.ok ? `Verified ${d.scanned} entries` : `Tamper detected at seq ${d.first_bad_seq}`)
    } finally { setBusy(false) }
  }

  return (
    <button onClick={verify} disabled={busy}
      className={
        'inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-[12px] font-semibold transition-colors ' +
        (ok === null
          ? 'border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white'
          : ok
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300')
      }>
      {busy ? <CircleNotch size={12} className="animate-spin" /> :
        ok === false ? <ShieldWarning size={12} weight="fill" /> : <ShieldCheck size={12} weight="fill" />}
      {detail}
    </button>
  )
}