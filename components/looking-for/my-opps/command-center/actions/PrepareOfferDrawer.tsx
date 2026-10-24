'use client'

import { useState } from 'react'
import { DrawerShell } from '../parts/DrawerShell'
import { Handshake, CircleNotch, PaperPlaneTilt } from '@phosphor-icons/react'

interface Props {
  open: boolean
  onClose: () => void
  onCompleted: () => void
  applicationId: string
  opportunityId: string
  applicantName?: string | null
}

export function PrepareOfferDrawer({ open, onClose, onCompleted, applicationId, opportunityId, applicantName }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(`Offer for ${applicantName || 'Candidate'}`)
  const [roleTitle, setRoleTitle] = useState('Senior Full-Stack Engineer')
  const [employmentType, setEmploymentType] = useState('contract')
  const [compAmount, setCompAmount] = useState(5000)
  const [compCurrency, setCompCurrency] = useState('USD')
  const [compPeriod, setCompPeriod] = useState('monthly')
  const [equity, setEquity] = useState('')
  const [startDate, setStartDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [terms, setTerms] = useState(
    `## Role & Responsibilities\nYou will be responsible for core backend and architecture tasks.\n\n## Terms & Expectations\n- Independent Contractor / Team Member Agreement\n- Weekly syncs on Mondays\n- IP assigned to the organization upon payout.`
  )
  const [customMsg, setCustomMsg] = useState('We are thrilled to offer you this role! Please review the terms and accept when ready.')

  const handleCreateAndSend = async () => {
    setBusy(true); setError(null)
    try {
      // 1. Prepare offer draft
      const prepRes = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          opportunity_id: opportunityId,
          title,
          role_title: roleTitle,
          employment_type: employmentType,
          compensation_amount: Number(compAmount),
          compensation_currency: compCurrency,
          compensation_period: compPeriod,
          equity_percentage: equity ? Number(equity) : null,
          start_date: startDate,
          terms_markdown: terms,
        }),
      })
      const prepData = await prepRes.json()
      if (!prepRes.ok) throw new Error(prepData.error || 'Failed to prepare offer')

      // 2. Send offer to candidate
      const sendRes = await fetch(`/api/offers/${prepData.offer.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_message: customMsg }),
      })
      if (!sendRes.ok) throw new Error('Failed to send offer')

      onCompleted()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DrawerShell
      open={open}
      onClose={busy ? () => {} : onClose}
      title="Prepare & Issue Offer"
      subtitle={`Create a formal offer packet for ${applicantName || 'Candidate'}`}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500">Candidate receives notification + DSRT Mail with digital sign link.</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={busy} className="h-10 px-4 rounded-xl border border-zinc-800 text-[13px] text-zinc-300 font-semibold">Cancel</button>
            <button onClick={handleCreateAndSend} disabled={busy || !compAmount}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-amber-400 text-black hover:bg-amber-300 text-[13px] font-bold shadow-[0_2px_16px_rgba(251,191,36,0.2)]">
              {busy ? <CircleNotch size={14} className="animate-spin" /> : <PaperPlaneTilt size={14} weight="bold" />}
              Send Official Offer
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Role Title</label>
          <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-white focus:outline-none focus:border-zinc-700" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Currency</label>
            <select value={compCurrency} onChange={(e) => setCompCurrency(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Amount</label>
            <input type="number" value={compAmount} onChange={(e) => setCompAmount(Number(e.target.value))} className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-white focus:outline-none focus:border-zinc-700" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Frequency</label>
            <select value={compPeriod} onChange={(e) => setCompPeriod(e.target.value as any)} className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white">
              <option value="hourly">/ Hour</option>
              <option value="monthly">/ Month</option>
              <option value="annual">/ Year</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-white" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Equity % (Optional)</label>
            <input type="number" step="0.1" value={equity} onChange={(e) => setEquity(e.target.value)} placeholder="e.g. 1.5" className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[13.5px] text-white focus:outline-none focus:border-zinc-700" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Offer Terms & Conditions (Markdown)</label>
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={6} className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 font-sans focus:outline-none focus:border-zinc-700 resize-y" />
        </div>

        {error && <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-[12.5px] text-red-400">{error}</div>}
      </div>
    </DrawerShell>
  )
}