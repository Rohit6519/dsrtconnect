'use client'

import { useState } from 'react'
import { X, CheckCircle, CircleNotch, ShieldCheck } from '@phosphor-icons/react'

export function AcceptOfferModal({ offer, onClose, onSuccess }: { offer: any; onClose: () => void; onSuccess: () => void }) {
  const [signature, setSignature] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSign = async () => {
    if (!signature.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/offers/${offer.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', signature_name: signature.trim() }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to sign offer')
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0c0d10] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-[16px] font-bold text-white">Digitally Sign Offer</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="text-[13px] text-zinc-300 space-y-2">
          <p>By typing your full legal name below, you officially accept the offer for <strong>{offer.role_title}</strong> at <strong>{offer.compensation_currency} {offer.compensation_amount.toLocaleString()} / {offer.compensation_period}</strong>.</p>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11.5px] text-zinc-500 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            Your IP address and timestamp will be permanently linked to this signature in the DSRT Compliance Audit Log.
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Type Full Legal Name</label>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="e.g. Alex Ryder"
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[15px] font-semibold text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {error && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-[12.5px] text-red-400">{error}</div>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={busy} className="h-10 px-4 rounded-xl border border-zinc-800 text-[13px] font-semibold text-zinc-300">Cancel</button>
          <button
            onClick={handleSign}
            disabled={busy || !signature.trim()}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-emerald-500 text-black font-bold text-[13px] hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? <CircleNotch size={14} className="animate-spin" /> : <CheckCircle size={14} weight="bold" />}
            Confirm Digital Signature
          </button>
        </div>
      </div>
    </div>
  )
}