'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, ArrowUpRight, Users, MapPin, Coins } from '@phosphor-icons/react'

export function DistributedOpportunities({
  destinationType,
  destinationId,
}: {
  destinationType: 'project' | 'venture' | 'community'
  destinationId: string
}) {
  const [opps, setOpps] = useState<any[] | null>(null)

  useEffect(() => {
    fetch(`/api/opportunities/distributed?type=${destinationType}&id=${destinationId}`)
      .then(r => r.ok ? r.json() : { opportunities: [] })
      .then(d => setOpps(d.opportunities || []))
      .catch(() => setOpps([]))
  }, [destinationType, destinationId])

  if (opps === null) return null // loading silently
  if (opps.length === 0) return null // hide section if nothing active

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase size={16} weight="fill" className="text-zinc-400" />
        <h3 className="text-[15px] font-bold text-white">Open Roles & Opportunities</h3>
        <span className="ml-2 inline-flex items-center h-5 px-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10.5px] font-bold text-zinc-400">
          {opps.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {opps.map(opp => {
          const type = (opp.opportunity_type || '').replace(/-/g, ' ')
          return (
            <Link
              key={opp.id}
              href={`/looking-for/${opp.slug || opp.id}`}
              className="group block rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 hover:bg-zinc-900/50 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    {type}
                  </div>
                  <h4 className="text-[14px] font-bold text-zinc-100 group-hover:text-white truncate">
                    {opp.title}
                  </h4>
                </div>
                <ArrowUpRight size={14} className="text-zinc-600 group-hover:text-white shrink-0 mt-1" />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11.5px] text-zinc-400">
                {opp.work_mode && (
                  <span className="flex items-center gap-1.5 capitalize">
                    <MapPin size={12} className="text-zinc-500" />
                    {opp.work_mode}
                  </span>
                )}
                {opp.compensation_type && opp.compensation_type !== 'unpaid' && (
                  <span className="flex items-center gap-1.5 capitalize text-emerald-400/90">
                    <Coins size={12} />
                    {opp.compensation_type}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}