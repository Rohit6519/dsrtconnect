'use client'

import { Section } from '../parts/Section'

export function SourcesView({ data }: { data: any }) {
  const rows: any[] = data.sources || []
  const totalViews = rows.reduce((s, r) => s + (r.views || 0), 0)

  if (!rows.length) {
    return (
      <Section title="Traffic sources" subtitle="Where opportunity views and applications came from">
        <div className="text-center text-[12.5px] text-zinc-500 py-10">
          No source data in this range yet. Sources are captured from event metadata as visitors reach an opportunity.
        </div>
      </Section>
    )
  }

  return (
    <Section title="Traffic sources" subtitle="Where opportunity views and applications came from">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 border-b border-zinc-800/70">
              <th className="py-2 pr-3">Source</th>
              <th className="py-2 pr-3 text-right">Views</th>
              <th className="py-2 pr-3 text-right">Share of traffic</th>
              <th className="py-2 pr-3 text-right">Applications</th>
              <th className="py-2 pr-3 text-right">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.map(r => {
              const share = totalViews > 0 ? (r.views / totalViews) * 100 : 0
              return (
                <tr key={r.source} className="text-[12.5px]">
                  <td className="py-2.5 pr-3 capitalize text-zinc-200 font-semibold">{r.source.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-3 text-right text-white">{Number(r.views || 0).toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right w-[220px]">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-[140px] h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full bg-white/80" style={{ width: `${Math.min(100, share).toFixed(1)}%` }} />
                      </div>
                      <span className="text-zinc-300 tabular-nums w-10 text-right">{Math.round(share)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right text-zinc-200">{Number(r.applications || 0).toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-right text-emerald-300">{r.conversion}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}