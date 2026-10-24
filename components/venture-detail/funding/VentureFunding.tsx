'use client'

import { useState } from 'react'
import { Plus, CurrencyDollar, Calendar, TrendUp, Users, Lightning } from '@phosphor-icons/react'

interface Props {
  venture: any
  rounds: any[]
  slug: string
  isOwner: boolean
  onUpdate: (patch: any) => Promise<void>
}

export function VentureFunding({ venture, rounds, slug, isOwner, onUpdate }: Props) {
  const isRaising = venture.seeking_investment

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-white">Funding</h2>
          {isRaising ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[12.5px] text-emerald-300 font-semibold">Currently Raising</span>
            </div>
          ) : (
            <p className="text-[12.5px] text-white/45 mt-0.5">Investment history & current round</p>
          )}
        </div>
        {isOwner && (
          <button className="text-[12.5px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 h-9 rounded-lg flex items-center gap-1.5">
            <Plus size={13} weight="bold" /> Add Round
          </button>
        )}
      </div>

      {isRaising && venture.funding_amount && (
        <div className="bg-gradient-to-br from-emerald-500/[0.08] via-white/[0.02] to-transparent border border-emerald-500/25 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <CurrencyDollar size={18} weight="fill" className="text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-white">Raising {venture.funding_stage || 'a round'}</p>
              <p className="text-[22px] font-black text-emerald-300 mt-1 leading-none">{venture.funding_amount}</p>
              {venture.runway && (
                <p className="text-[11.5px] text-white/50 mt-2">Runway: {venture.runway}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {rounds.length === 0 && !isRaising ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/5 border border-white/[0.06] items-center justify-center mb-4">
            <CurrencyDollar size={26} className="text-white/40" />
          </div>
          <p className="text-[15px] font-semibold text-white">No funding disclosed</p>
          <p className="text-[12.5px] text-white/45 mt-1 max-w-sm mx-auto">
            {isOwner ? 'Add funding rounds to attract investors and build credibility.' : 'This venture hasn\'t disclosed funding information.'}
          </p>
          {isOwner && (
            <button className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-lg">
              <Plus size={12} weight="bold" /> Add funding info
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map(r => (
            <div key={r.id} className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold text-white">{r.round_name}</h3>
                    {r.valuation && (
                      <span className="text-[10.5px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">{r.valuation} valuation</span>
                    )}
                  </div>
                  {r.date && (
                    <div className="flex items-center gap-1 text-[11.5px] text-white/45 mt-1">
                      <Calendar size={11} weight="fill" />
                      {new Date(r.date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                {r.amount && (
                  <p className="text-[20px] font-black text-white whitespace-nowrap">{r.amount}</p>
                )}
              </div>
              {r.lead_investor && (
                <p className="text-[12px] text-white/60 mt-2">
                  <span className="text-white/40">Lead:</span> {r.lead_investor}
                </p>
              )}
              {r.investors && r.investors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {r.investors.map((inv: string) => (
                    <span key={inv} className="text-[10.5px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                      {inv}
                    </span>
                  ))}
                </div>
              )}
              {r.use_of_funds && (
                <p className="text-[12px] text-white/60 italic mt-3 pt-3 border-t border-white/[0.05]">{r.use_of_funds}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
