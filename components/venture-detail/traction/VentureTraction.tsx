'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, TrendUp, TrendDown, ChartLineUp, Sparkle } from '@phosphor-icons/react'

interface Props {
  venture: any
  metrics: any[]
  slug: string
  isOwner: boolean
}

export function VentureTraction({ venture, metrics, slug, isOwner }: Props) {
  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-white">Traction</h2>
          <p className="text-[12.5px] text-white/45 mt-0.5">Growth metrics that matter</p>
        </div>
        {isOwner && (
          <button className="text-[12.5px] font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-3.5 h-9 rounded-lg flex items-center gap-1.5">
            <Plus size={13} weight="bold" /> Add Metric
          </button>
        )}
      </div>

      {/* KEY METRICS SUMMARY */}
      {(venture.revenue_range || venture.user_count || venture.monthly_growth || venture.key_metric_value) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {venture.revenue_range && <KeyMetricTile label="Revenue" value={venture.revenue_range} icon={ChartLineUp} tint="text-green-300 bg-green-500/10" />}
          {venture.user_count && <KeyMetricTile label="Users" value={venture.user_count} icon={ChartLineUp} tint="text-blue-300 bg-blue-500/10" />}
          {venture.monthly_growth && <KeyMetricTile label="MoM Growth" value={venture.monthly_growth} icon={TrendUp} tint="text-emerald-300 bg-emerald-500/10" positive />}
          {venture.key_metric_label && venture.key_metric_value && <KeyMetricTile label={venture.key_metric_label} value={venture.key_metric_value} icon={Sparkle} tint="text-purple-300 bg-purple-500/10" />}
        </div>
      )}

      {/* METRIC CHARTS */}
      {metrics.length === 0 ? (
        <EmptyMetrics isOwner={isOwner} />
      ) : (
        <div className="space-y-4">
          {metrics.map(m => <MetricChartCard key={m.id} metric={m} />)}
        </div>
      )}
    </div>
  )
}

function KeyMetricTile({ label, value, icon: Icon, tint, positive }: { label: string; value: string; icon: any; tint: string; positive?: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div className={'w-7 h-7 rounded-lg flex items-center justify-center ' + tint}>
          <Icon size={13} weight="fill" />
        </div>
        <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{label}</p>
      </div>
      <p className={'text-[24px] font-black leading-none tracking-tight ' + (positive ? 'text-emerald-300' : 'text-white')}>{value}</p>
    </div>
  )
}

function MetricChartCard({ metric }: { metric: any }) {
  const entries = metric.venture_metric_entries || []
  const chartData = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map(e => ({
    date: new Date(e.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    value: parseFloat(e.value),
  }))

  const latest = entries.length > 0 ? parseFloat(entries[entries.length - 1].value) : 0
  const prev = entries.length > 1 ? parseFloat(entries[entries.length - 2].value) : 0
  const change = prev > 0 ? ((latest - prev) / prev) * 100 : 0
  const positive = change >= 0

  const prefix = metric.type === 'currency' && metric.currency === 'USD' ? '$' : ''
  const suffix = metric.unit ? ' ' + metric.unit : ''

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between border-b border-white/[0.06]">
        <div>
          <h3 className="text-[14px] font-bold text-white">{metric.name}</h3>
          <p className="text-[11px] text-white/45 mt-0.5 capitalize">{metric.frequency} · {metric.type}</p>
        </div>
        <div className="text-right">
          <p className="text-[24px] font-black text-white leading-none">{prefix}{latest.toLocaleString()}{suffix}</p>
          {entries.length > 1 && (
            <div className={'flex items-center justify-end gap-0.5 mt-1 text-[11.5px] font-semibold ' + (positive ? 'text-emerald-300' : 'text-red-400')}>
              {positive ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      {chartData.length > 1 ? (
        <div className="h-[180px] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id={'mg_' + metric.id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f0f18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', padding: '8px 12px' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '10px' }}
                itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} fill={'url(#mg_' + metric.id + ')'} name={metric.name} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-5 text-center">
          <p className="text-[12px] text-white/40">Add more data points to see the trend</p>
        </div>
      )}
    </div>
  )
}

function EmptyMetrics({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
      <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/[0.06] items-center justify-center mb-4">
        <ChartLineUp size={26} className="text-white/40" />
      </div>
      <p className="text-[15px] font-semibold text-white">No metrics tracked yet</p>
      <p className="text-[12.5px] text-white/45 mt-1 max-w-sm mx-auto">
        {isOwner ? 'Add metrics like MRR, users, or growth rate to show your traction.' : 'This venture hasn\'t shared metrics yet.'}
      </p>
      {isOwner && (
        <button className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-lg">
          <Plus size={12} weight="bold" /> Add first metric
        </button>
      )}
    </div>
  )
}
