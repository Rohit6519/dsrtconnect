'use client'

import { useEffect, useState } from 'react'

export function ManageAnalyticsTab({ opportunityId }: { opportunityId: string }) {
  const [range, setRange] = useState('30d')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/opportunities/${opportunityId}/analytics?range=${range}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [opportunityId, range])

  if (loading) {
    return <div className="h-64 rounded-2xl border border-zinc-800 animate-pulse bg-zinc-950/40" />
  }
  if (!data) {
    return <div className="text-[13px] text-zinc-500">Failed to load analytics</div>
  }

  const f = data.funnel
  const c = data.conversions
  const funnelSteps = [
    { label: 'Views', value: f.views },
    { label: 'Unique', value: f.unique_visitors },
    { label: 'Interested', value: f.interested },
    { label: 'App starts', value: f.application_starts },
    { label: 'Applications', value: f.applications },
    { label: 'Qualified', value: f.qualified },
    { label: 'Shortlisted', value: f.shortlisted },
    { label: 'Interviewed', value: f.interviewed },
    { label: 'Selected', value: f.selected },
  ]
  const maxF = Math.max(...funnelSteps.map(s => s.value), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-white">Analytics</h2>
        <div className="flex gap-1 p-1 rounded-xl border border-zinc-800 bg-zinc-950">
          {['24h', '7d', '30d', 'lifetime'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={'h-8 px-3 rounded-lg text-[12px] font-semibold ' + (range === r ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Object.entries(data.kpis).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-zinc-800/80 p-4 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{k.replace(/_/g, ' ')}</div>
            <div className="text-[20px] font-bold text-white">{typeof v === 'number' ? v.toLocaleString() : String(v)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-4">Conversion funnel</h3>
          <div className="space-y-2.5">
            {funnelSteps.map(step => (
              <div key={step.label}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-zinc-400">{step.label}</span>
                  <span className="text-white font-semibold">{step.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-zinc-600 via-zinc-300 to-white"
                    style={{ width: `${Math.max(4, (step.value / maxF) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-[11.5px]">
            <Conv label="View → App" value={c.view_to_application} />
            <Conv label="App → Qualified" value={c.application_to_qualified} />
            <Conv label="Qualified → Shortlist" value={c.qualified_to_shortlisted} />
            <Conv label="Interview → Selected" value={c.interview_to_selected} />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-4">Traffic sources</h3>
          {(data.sources || []).length === 0 ? (
            <p className="text-[12.5px] text-zinc-500 py-10 text-center">
              Source data appears as events are tracked from detail views and shares.
            </p>
          ) : (
            <div className="space-y-3">
              {data.sources.map((s: any) => (
                <div key={s.source} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-white capitalize">{s.source.replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-zinc-500">{s.applications} apps</div>
                  </div>
                  <div className="text-[13px] font-bold text-zinc-200">{s.views} views</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-4">Activity over time</h3>
        {(data.daily || []).length === 0 ? (
          <p className="text-[12.5px] text-zinc-500 py-8 text-center">No daily aggregates yet — events will fill this chart.</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {data.daily.map((d: any) => {
              const h = Math.max(4, (d.views / Math.max(...data.daily.map((x: any) => x.views || 1))) * 100)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full rounded-t bg-gradient-to-t from-zinc-700 to-white/80" style={{ height: `${h}%` }} title={`${d.date}: ${d.views} views, ${d.applications_submitted} apps`} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Conv({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
      <div className="text-[10px] text-zinc-500 mb-0.5">{label}</div>
      <div className="text-[14px] font-bold text-emerald-400">{value}%</div>
    </div>
  )
}