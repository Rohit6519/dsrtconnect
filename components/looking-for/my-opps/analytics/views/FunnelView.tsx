'use client'

import { Section } from '../parts/Section'
import { KpiCard } from '../parts/KpiCard'

const STEPS = [
  { key: 'views', label: 'Views' },
  { key: 'unique_viewers', label: 'Unique viewers' },
  { key: 'interested', label: 'Interested' },
  { key: 'apply_clicks', label: 'Apply clicks' },
  { key: 'application_starts', label: 'Application starts' },
  { key: 'application_submitted', label: 'Applications submitted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interviewed', label: 'Interviewed' },
  { key: 'selected', label: 'Selected' },
]

const CONV_ROWS = [
  { key: 'view_to_apply_click', label: 'View → Apply click' },
  { key: 'apply_click_to_start', label: 'Apply click → Start' },
  { key: 'start_to_submit', label: 'Start → Submit' },
  { key: 'submit_to_qualified', label: 'Submit → Qualified' },
  { key: 'qualified_to_shortlist', label: 'Qualified → Shortlist' },
  { key: 'shortlist_to_interview', label: 'Shortlist → Interview' },
  { key: 'interview_to_selected', label: 'Interview → Selected' },
]

export function FunnelView({ data }: { data: any }) {
  const f = data.funnel
  const c = data.conversions
  const max = Math.max(1, ...STEPS.map(s => Number(f[s.key] || 0)))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <KpiCard label="Applications" value={f.application_submitted} />
        <KpiCard label="View → App" value={`${c.view_to_application}%`} />
        <KpiCard label="Submit → Qualified" value={`${c.submit_to_qualified}%`} />
        <KpiCard
          label="Avg. time to apply"
          value={data.kpis.avg_time_to_apply_seconds != null ? `${data.kpis.avg_time_to_apply_seconds}s` : '—'}
          sub="From apply click to submission"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Stage funnel" subtitle="Absolute counts in this range">
          <div className="space-y-2.5">
            {STEPS.map(s => {
              const v = Number(f[s.key] || 0)
              const w = Math.max(4, (v / max) * 100)
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-zinc-400">{s.label}</span>
                    <span className="text-white font-semibold">{v.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/80"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Stage conversions" subtitle="Percentage moving from one step to the next">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 border-b border-zinc-800/70">
                <th className="py-2 pr-3">Transition</th>
                <th className="py-2 pr-3 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {CONV_ROWS.map(row => (
                <tr key={row.key} className="text-[12.5px]">
                  <td className="py-2.5 pr-3 text-zinc-300">{row.label}</td>
                  <td className="py-2.5 pr-3 text-right text-white font-semibold">{Number(c[row.key] || 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  )
}