'use client'

import { useState, useEffect } from 'react'
import {
  Eye, Users, Heart, BookmarkSimple, ChartLineUp,
  TrendUp, TrendDown
} from '@phosphor-icons/react'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

interface Props {
  slug: string
  isOwner: boolean
}

interface DailyStat {
  date: string
  views: number
  unique_views: number
  followers: number
  saves: number
}

export function ProjectAnalyticsPanel({ slug, isOwner }: Props) {
  const [stats, setStats] = useState<any>(null)
  const [daily, setDaily] = useState<DailyStat[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOwner) return
    setLoading(true)
    fetch(`/api/projects/${slug}/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => {
        setStats(d.stats || {})
        setDaily(d.daily || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, days, isOwner])

  if (!isOwner) return null

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-5">
        <div className="h-5 w-32 bg-white/[0.06] rounded animate-pulse mb-4" />
        <div className="h-[180px] bg-white/[0.04] rounded animate-pulse" />
      </div>
    )
  }

  if (!stats) return null

  const metrics = [
    { label: 'Total Views', value: stats.total_views || 0, icon: Eye },
    { label: 'Unique Views', value: stats.unique_views || 0, icon: Eye },
    { label: 'Followers', value: stats.total_followers || 0, icon: Heart },
    { label: 'Saves', value: stats.total_saves || 0, icon: BookmarkSimple },
    { label: 'Applications', value: stats.total_applications || 0, icon: Users },
  ]

  const viewsLast7 = stats.views_last_7d || 0
  const viewsLast30 = stats.views_last_30d || 0
  const growthPercent = viewsLast30 > 0
    ? Math.round(((viewsLast7 * 4.3 - viewsLast30) / Math.max(viewsLast30, 1)) * 100)
    : 0

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ChartLineUp size={16} weight="fill" className="text-white/50" />
          <h3 className="text-[15px] font-semibold text-white">Project Analytics</h3>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="text-[11px] text-white/70 bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1 outline-none cursor-pointer"
        >
          <option value={7} className="bg-[#12121a]">7 days</option>
          <option value={30} className="bg-[#12121a]">30 days</option>
          <option value={90} className="bg-[#12121a]">90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-5 divide-x divide-white/[0.05] border-b border-white/[0.06]">
        {metrics.map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Icon size={11} className="text-white/40" />
                <p className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">{m.label}</p>
              </div>
              <p className="text-[18px] font-bold text-white tabular-nums">{m.value.toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      <div className="px-6 py-3 flex items-center gap-3 border-b border-white/[0.06]">
        <p className="text-[12px] text-white/60">Weekly trend</p>
        <div className={`flex items-center gap-1 text-[12px] font-semibold ${growthPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {growthPercent >= 0 ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
          {Math.abs(growthPercent)}%
        </div>
      </div>

      {daily.length > 0 && (
        <div className="px-4 py-4">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="projViewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(v: any) => {
                    if (!v) return ''
                    const d = new Date(v)
                    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#0f0f18',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    padding: '6px 10px',
                  }}
                  labelFormatter={(v: any) => {
                    if (!v) return ''
                    return new Date(v).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  fill="url(#projViewsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}