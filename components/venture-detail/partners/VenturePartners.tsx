'use client'

import { Plus, Handshake, ArrowSquareOut, CheckCircle } from '@phosphor-icons/react'

const PARTNER_TYPES: Record<string, string> = {
  partner: 'Partners', investor: 'Investors', customer: 'Customers',
  accelerator: 'Accelerators', institution: 'Institutions', technology: 'Technology'
}

interface Props {
  venture: any
  partners: any[]
  slug: string
  isOwner: boolean
}

export function VenturePartners({ venture, partners, slug, isOwner }: Props) {
  const grouped = partners.reduce((acc: Record<string, any[]>, p) => {
    const t = p.type || 'partner'
    if (!acc[t]) acc[t] = []
    acc[t].push(p)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-white">Partners & Ecosystem</h2>
          <p className="text-[12.5px] text-white/45 mt-0.5">Your customers, investors & partners</p>
        </div>
        {isOwner && (
          <button className="text-[12.5px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 h-9 rounded-lg flex items-center gap-1.5">
            <Plus size={13} weight="bold" /> Add Partner
          </button>
        )}
      </div>

      {partners.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/[0.06] items-center justify-center mb-4">
            <Handshake size={26} className="text-white/40" />
          </div>
          <p className="text-[15px] font-semibold text-white">No partners yet</p>
          <p className="text-[12.5px] text-white/45 mt-1 max-w-sm mx-auto">
            {isOwner ? 'Showcase your customers, investors, and technology partners.' : 'This venture hasn\'t added partners yet.'}
          </p>
          {isOwner && (
            <button className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-lg">
              <Plus size={12} weight="bold" /> Add partner
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-3">{PARTNER_TYPES[type] || type}</p>
              <div className="flex flex-wrap gap-2.5">
                {items.map((partner: any) => (
                  <div key={partner.id} className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] rounded-xl px-3 py-2 transition-colors">
                    {partner.logo_url ? (
                      <img src={partner.logo_url} alt={partner.name} className="w-7 h-7 rounded object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-white/60">
                        {partner.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-[12.5px] font-semibold text-white">{partner.name}</span>
                    {partner.is_verified && <CheckCircle size={11} weight="fill" className="text-blue-400" />}
                    {partner.website && (
                      <a href={partner.website} target="_blank" rel="noopener noreferrer">
                        <ArrowSquareOut size={11} className="text-white/40 hover:text-white" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
