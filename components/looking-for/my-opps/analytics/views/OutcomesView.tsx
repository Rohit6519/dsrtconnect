'use client'

import { KpiCard } from '../parts/KpiCard'
import { Section } from '../parts/Section'

export function OutcomesView({ data }: { data: any }) {
  const o = data.outcomes
  const total = (o.selected || 0) + (o.rejected || 0) + (o.withdrawn || 0) + (o.still_open || 0)
  const rate = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Selected" value={o.selected} sub={`${rate(o.selected)}% of decisions`} />
        <KpiCard label="Rejected" value={o.rejected} sub={`${rate(o.rejected)}%`} />
        <KpiCard label="Withdrawn" value={o.withdrawn} sub={`${rate(o.withdrawn)}%`} />
        <KpiCard label="Still open" value={o.still_open} sub={`${rate(o.still_open)}%`} />
      </div>

      <Section title="Per-opportunity outcomes" subtitle="Aggregate across selected date range">
        {data.per_opportunity.length === 0 ? (
          <div className="text-center text-[12.5px] text-zinc-500 py-10">
            No applications in this range yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 border-b border-zinc-800/70">
                  <th className="py-2 pr-3">Opportunity</th>
                  <th className="py-2 pr-3 text-right">Applications</th>
                  <th className="py-2 pr-3 text-right">Qualified</th>
                  <th className="py-2 pr-3 text-right">Selected</th>
                  <th className="py-2 pr-3 text-right">Selection rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.per_opportunity.map((r: any) => {
                  const sel = r.applications > 0 ? Math.round((r.selected / r.applications) * 1000) / 10 : 0
                  return (
                    <tr key={r.id} className="text-[12.5px]">
                      <td className="py-2.5 pr-3">
                        <div className="text-white font-semibold truncate max-w-[420px]">{r.title}</div>
                        <div className="text-[10.5px] text-zinc-500 font-mono">{r.opportunity_number || r.id.slice(0, 8)}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-zinc-200">{r.applications.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right text-zinc-200">{r.qualified.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right text-emerald-300">{r.selected.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-right text-white font-semibold">{sel}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}