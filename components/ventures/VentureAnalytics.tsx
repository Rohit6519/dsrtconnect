'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Props {
  slug: string
}

export function VentureAnalytics({ slug }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<'views' | 'unique_views'>('views')

  useEffect(() => {
    setLoading(true)
    fetch('/api/ventures/' + slug + '/analytics?days=' + days)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, days])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.02] border border-white/[0.06] rounded-lg animate-pulse" />)}
        </div>
        <div className="h-[280px] bg-white/[0.02] border border-white/[0.06] rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  const stats = data.stats || {}
  const daily = data.daily || []
  const changes = data.changes || {}

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-white">Analytics</h2>
        <div className="flex items-center gap-1">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={
                'px-3 h-8 text-[12px] font-semibold rounded-md transition-colors ' +
                (days === d
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]')
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total views"
          value={stats.total_views || 0}
          change={changes.views_7d}
          detail={`${stats.views_last_7d || 0} last 7d`}
        />
        <StatCard
          label="Unique views"
          value={stats.unique_views || 0}
        />
        <StatCard
          label="Followers"
          value={stats.total_followers || 0}
          change={changes.followers_7d}
        />
        <StatCard
          label="Applications"
          value={stats.total_applications || 0}
        />
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-white">
            {metric === 'views' ? 'Views' : 'Unique views'} over time
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMetric('views')}
              className={
                'px-2.5 h-7 text-[11.5px] font-semibold rounded transition-colors ' +
                (metric === 'views' ? 'bg-white text-black' : 'text-white/50 hover:text-white')
              }
            >
              Views
            </button>
            <button
              onClick={() => setMetric('unique_views')}
              className={
                'px-2.5 h-7 text-[11.5px] font-semibold rounded transition-colors ' +
                (metric === 'unique_views' ? 'bg-white text-black' : 'text-white/50 hover:text-white')
              }
            >
              Unique
            </button>
          </div>
        </div>

        <div className="h-[240px]">
          {daily.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(v) => {
                    const d = new Date(v)
                    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f0f18',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '10px' }}
                  itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  fill="url(#viewsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-[13px] text-white/40">No data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-[13px] font-bold text-white mb-3">Saves</h3>
          <p className="text-[28px] font-bold text-white">{stats.total_saves || 0}</p>
          <p className="text-[11.5px] text-white/45 mt-1">People who saved your venture</p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-[13px] font-bold text-white mb-3">Last 30 days</h3>
          <p className="text-[28px] font-bold text-white">{stats.views_last_30d || 0}</p>
          <p className="text-[11.5px] text-white/45 mt-1">Views in the last month</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, change, detail,
}: {
  label: string
  value: number
  change?: number
  detail?: string
}) {
  const hasChange = change !== undefined && change !== 0

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-[26px] font-bold text-white leading-none">{formatNum(value)}</p>
        {hasChange && (
          <span className={
            'text-[11px] font-bold ' +
            (change! > 0 ? 'text-emerald-400' : change! < 0 ? 'text-red-400' : 'text-white/40')
          }>
            {change! > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      {detail && <p className="text-[10.5px] text-white/40 mt-1.5">{detail}</p>}
    </div>
  )
}

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}
