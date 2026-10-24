'use client'

import { useState, useEffect } from 'react'
import { Handshake, CheckCircle, XCircle, FileText } from '@phosphor-icons/react'
import { AcceptOfferModal } from './AcceptOfferModal'

export function OfferCard({ applicationId }: { applicationId: string }) {
  const [offer, setOffer] = useState<any>(null)
  const [showSignModal, setShowSignModal] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/offers?application_id=${applicationId}`)
    const data = await res.json()
    if (data.offers?.length > 0) setOffer(data.offers[0])
  }

  useEffect(() => { load() }, [applicationId])

  if (!offer) return null

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-[#141418] to-[#0f0f11] p-6 shadow-[0_8px_32px_rgba(251,191,36,0.1)]">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Handshake size={24} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[18px] font-bold text-white">{offer.title}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-300">
              {offer.status}
            </span>
          </div>
          <div className="text-[14px] text-zinc-300 font-medium">
            {offer.compensation_currency} {offer.compensation_amount.toLocaleString()} / {offer.compensation_period}
            {offer.equity_percentage && ` · ${offer.equity_percentage}% Equity`}
          </div>
          <div className="text-[12px] text-zinc-500 mt-1">Proposed Start Date: {new Date(offer.start_date).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="mt-5 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
        {offer.terms_markdown}
      </div>

      {offer.status === 'sent' || offer.status === 'viewed' ? (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setShowSignModal(true)}
            className="h-11 px-6 rounded-xl bg-emerald-500 text-black font-bold text-[13.5px] hover:bg-emerald-400 transition-colors shadow-sm flex items-center gap-2"
          >
            <CheckCircle size={16} weight="bold" /> Review & Digitally Sign Offer
          </button>
        </div>
      ) : offer.status === 'accepted' ? (
        <div className="mt-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[12.5px] font-semibold flex items-center gap-2">
          <CheckCircle size={16} weight="fill" /> Digitally Signed as "{offer.candidate_signature_name}" on {new Date(offer.candidate_signed_at).toLocaleString()}
        </div>
      ) : null}

      {showSignModal && (
        <AcceptOfferModal
          offer={offer}
          onClose={() => setShowSignModal(false)}
          onSuccess={() => { setShowSignModal(false); load() }}
        />
      )}
    </div>
  )
}