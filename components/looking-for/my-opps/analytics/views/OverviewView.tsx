'use client'

import { KpiCard } from '../parts/KpiCard'
import { Section } from '../parts/Section'
import { LineArea } from '../parts/LineArea'

export function OverviewView({ data }: { data: any }) {
  const k = data.kpis
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="Views" value={k.total_views} />
        <KpiCard label="Unique visitors" value={k.unique_viewers} />
        <KpiCard label="Applications" value={k.applications} />
        <KpiCard label="Qualified" value={k.qualified} />
        <KpiCard label="Selected" value={k.selected} />
        <KpiCard label="View → App" value={`${k.application_conversion}%`} />
      </div>

      <Section title="Activity over time" subtitle="Views vs. applications submitted, per day">
        <LineArea
          data={data.series}
          series={[
            { key: 'views', label: 'Views', color: 'rgba(255,255,255,0.9)' },
            { key: 'applications_submitted', label: 'Applications', color: 'rgba(59,130,246,0.9)' },
          ]}
        />
      </Section>

      <Section title="Top opportunities in this range" subtitle="Sorted by views">
        <TopOpps rows={data.per_opportunity} />
      </Section>
    </div>
  )
}

function TopOpps({ rows }: { rows: any[] }) {
  if (!rows.length) {
    return <div className="text-[12.5px] text-zinc-500 text-center py-6">No opportunity data in this range.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 border-b border-zinc-800/70">
            <th className="py-2 pr-3">Opportunity</th>
            <th className="py-2 pr-3 text-right">Views</th>
            <th className="py-2 pr-3 text-right">Apps</th>
            <th className="py-2 pr-3 text-right">Qualified</th>
            <th className="py-2 pr-3 text-right">Selected</th>
            <th className="py-2 pr-3 text-right">Conv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.slice(0, 10).map(r => (
            <tr key={r.id} className="text-[12.5px]">
              <td className="py-2.5 pr-3">
                <div className="text-white font-semibold truncate max-w-[420px]">{r.title}</div>
                <div className="text-[10.5px] text-zinc-500 font-mono">{r.opportunity_number || r.id.slice(0, 8)}</div>
              </td>
              <td className="py-2.5 pr-3 text-right text-zinc-200">{r.views.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right text-zinc-200">{r.applications.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right text-zinc-200">{r.qualified.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right text-emerald-300">{r.selected.toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right text-zinc-300">{r.conversion}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}