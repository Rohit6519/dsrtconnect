'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { Eye, Users, Briefcase, BookmarkSimple, Clock, TrendUp } from '@phosphor-icons/react'

interface Props {
  slug: string
}

const RANGES = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
]

type ViewMode = 'total' | 'unique'

export function VentureAnalytics({ slug }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')
  const [viewMode, setViewMode] = useState<ViewMode>('total')

  useEffect(() => {
    setLoading(true)
    fetch('/api/ventures/' + slug + '/analytics?range=' + range)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [slug, range])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-[280px] bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data || data.error) {
    return (
      <div className="rounded-xl border border-white/[0.08] p-8 text-center">
        <p className="text-[14px] text-white/60">Unable to load analytics</p>
        {data?.error && <p className="text-[12px] text-white/40 mt-1">{data.error}</p>}
      </div>
    )
  }

  const { totals, rates, daily, followerTrend, applicationsOverTime, savesOverTime, sources } = data

  return (
    <div className="space-y-6">

      {/* Header — Range selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-white">Analytics</h2>
          <p className="text-[12.5px] text-white/45 mt-0.5">Track how your venture is performing</p>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={
                'text-[12px] font-semibold px-3 h-7 rounded-md transition-colors ' +
                (range === r.key
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white')
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Eye}
          label={viewMode === 'total' ? 'Total views' : 'Unique views'}
          value={viewMode === 'total' ? totals.totalViews : totals.uniqueViews}
          sublabel={viewMode === 'total'
            ? totals.uniqueViews + ' unique · ' + totals.ownerViews + ' by you'
            : totals.totalViews + ' total views'}
        />
        <StatCard
          icon={Users}
          label="Followers"
          value={totals.followers}
          sublabel={'+' + totals.follows + ' new · ' + rates.followRate + '% CVR'}
        />
        <StatCard
          icon={Briefcase}
          label="Applications"
          value={totals.applications}
          sublabel={rates.applicationRate + '% apply rate'}
        />
        <StatCard
          icon={BookmarkSimple}
          label="Saves"
          value={totals.saves}
          sublabel={rates.saveRate + '% save rate'}
        />
      </div>

      {/* Views chart with toggle */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-bold text-white">Page views</h3>
            <p className="text-[11.5px] text-white/45 mt-0.5">
              {viewMode === 'total'
                ? 'Every visit including yours and repeat visits'
                : 'Distinct sessions per day (deduplicated)'}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('total')}
              className={
                'text-[11.5px] font-semibold px-2.5 h-6 rounded transition-colors ' +
                (viewMode === 'total' ? 'bg-white text-black' : 'text-white/60 hover:text-white')
              }
            >
              Total
            </button>
            <button
              onClick={() => setViewMode('unique')}
              className={
                'text-[11.5px] font-semibold px-2.5 h-6 rounded transition-colors ' +
                (viewMode === 'unique' ? 'bg-white text-black' : 'text-white/60 hover:text-white')
              }
            >
              Unique
            </button>
          </div>
        </div>

        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                stroke="rgba(255,255,255,0.08)"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                stroke="rgba(255,255,255,0.08)"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#0f0f18',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                labelFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Area
                type="monotone"
                dataKey={viewMode === 'total' ? 'totalViews' : 'uniqueViews'}
                stroke="#ffffff"
                strokeWidth={2}
                fill="url(#viewsGrad)"
                name={viewMode === 'total' ? 'Total views' : 'Unique sessions'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column: Followers + Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Followers over time */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-white">Followers growth</h3>
            <p className="text-[11.5px] text-white/45 mt-0.5">
              {totals.follows} new followers · {rates.followRate}% conversion
            </p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={followerTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  stroke="rgba(255,255,255,0.08)"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  stroke="rgba(255,255,255,0.08)"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f0f18',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ffffff"
                  strokeWidth={2}
                  dot={false}
                  name="Total followers"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Applications */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-white">Applications</h3>
            <p className="text-[11.5px] text-white/45 mt-0.5">
              {totals.applications} total · {rates.applicationRate}% apply rate
            </p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={applicationsOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  stroke="rgba(255,255,255,0.08)"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  stroke="rgba(255,255,255,0.08)"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f0f18',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Bar dataKey="count" fill="#ffffff" fillOpacity={0.85} name="Applications" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two-column: Saves + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Saves */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-white">Saves</h3>
            <p className="text-[11.5px] text-white/45 mt-0.5">
              {totals.saves} total · {rates.saveRate}% save rate
            </p>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savesOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  stroke="rgba(255,255,255,0.08)"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  stroke="rgba(255,255,255,0.08)"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f0f18',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Bar dataKey="count" fill="#ffffff" fillOpacity={0.6} name="Saves" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic sources breakdown */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-white">Traffic sources</h3>
            <p className="text-[11.5px] text-white/45 mt-0.5">Where your viewers are coming from</p>
          </div>
          <div className="space-y-2">
            {Object.entries(sources).length === 0 ? (
              <p className="text-[12px] text-white/40 py-6 text-center">No traffic data yet</p>
            ) : (
              (Object.entries(sources) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([src, count]) => {
                  const pct = totals.totalViews > 0 ? (count / totals.totalViews) * 100 : 0
                  return (
                    <div key={src}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-white/85 font-semibold capitalize">{src}</span>
                        <span className="text-white/60">
                          {count} <span className="text-white/40">· {pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/70 rounded-full"
                          style={{ width: pct + '%' }}
                        />
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>

      {/* Extra insights row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MiniStat
          icon={Clock}
          label="Avg dwell time"
          value={totals.avgDwellMs > 0 ? formatDwell(totals.avgDwellMs) : '—'}
          hint="How long viewers stay on page"
        />
        <MiniStat
          icon={TrendUp}
          label="Best day"
          value={findBestDay(daily)}
          hint="Day with most views"
        />
        <MiniStat
          icon={Users}
          label="Unique visitors"
          value={String(totals.uniqueViewers)}
          hint="Distinct logged-in viewers"
        />
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, sublabel }: {
  icon: any
  label: string
  value: number
  sublabel: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} weight="regular" className="text-white/50" />
        <span className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[24px] font-bold text-white leading-none">{value.toLocaleString()}</p>
      <p className="text-[11px] text-white/45 mt-1.5 truncate">{sublabel}</p>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, hint }: {
  icon: any
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-white/45" />
        <span className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[15px] font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/35 mt-0.5">{hint}</p>
    </div>
  )
}

function formatDwell(ms: number): string {
  if (ms < 1000) return ms + 'ms'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return sec + 's'
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return min + 'm ' + rem + 's'
}

function findBestDay(daily: any[]): string {
  if (!daily || daily.length === 0) return '—'
  let best = daily[0]
  for (const d of daily) {
    if ((d.totalViews || 0) > (best.totalViews || 0)) best = d
  }
  if (best.totalViews === 0) return '—'
  return new Date(best.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) +
    ' (' + best.totalViews + ')'
}