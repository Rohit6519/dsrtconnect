'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts'
import { ChartLineUp, TrendUp, TrendDown, ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface GrowthOverviewProps {
  venture: any
  metrics: any[]
}

export function GrowthOverview({ venture, metrics }: GrowthOverviewProps) {
  const supabase = createClient()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    const load = async () => {
      if (metrics.length === 0) {
        setLoading(false)
        return
      }

      const metricIds = metrics.map(m => m.id)
      
      const { data } = await supabase
        .from('venture_metric_entries')
        .select('*, venture_metrics(name, type, unit, color)')
        .in('metric_id', metricIds)
        .order('date', { ascending: true })

      setEntries(data || [])
      setLoading(false)
    }
    load()
  }, [metrics, venture.id])

  // Aggregate all metric data into a composite growth score
  const chartData = calculateGrowthChart(entries, timeframe)
  const growthScore = calculateGrowthScore(entries, timeframe)

  if (metrics.length === 0 || entries.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
          <ChartLineUp className="w-6 h-6 text-blue-500" weight="fill" />
        </div>
        <h3 className="font-bold">Growth Overview</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Once you add metrics and enter data, we'll show you a composite growth chart
          weighted by all your key indicators
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <ChartLineUp className="w-4 h-4 text-blue-500" weight="fill" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Growth Overview</h3>
            <p className="text-[10px] text-muted-foreground">
              Composite of all metrics · AI-weighted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(['week', 'month', 'quarter', 'year'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`text-[10px] px-2 py-1 rounded font-semibold capitalize transition-colors ${
                timeframe === t 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Growth Score
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold tabular-nums">
              {growthScore.current.toFixed(0)}
            </span>
            <span className={`text-sm font-semibold flex items-center gap-0.5 ${
              growthScore.change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {growthScore.change >= 0 ? (
                <TrendUp className="w-3.5 h-3.5" weight="bold" />
              ) : (
                <TrendDown className="w-3.5 h-3.5" weight="bold" />
              )}
              {Math.abs(growthScore.change).toFixed(1)}%
            </span>
          </div>
        </div>

        <Link
          href={`/ventures/${venture.slug}/analytics`}
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          View Full Analytics
          <ArrowRight className="w-3 h-3" weight="bold" />
        </Link>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
                padding: '6px 10px',
              }}
              cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fill="url(#growthGradient)"
              dot={{ fill: 'hsl(217, 91%, 60%)', r: 3, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Metric contributions */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
          Metric Contributions
        </p>
        <div className="space-y-1.5">
          {metrics.slice(0, 5).map((m, i) => {
            const metricEntries = entries.filter(e => e.metric_id === m.id)
            const latest = metricEntries[metricEntries.length - 1]
            const previous = metricEntries[metricEntries.length - 2]
            const change = latest && previous 
              ? ((latest.value - previous.value) / previous.value * 100) 
              : 0

            return (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full bg-${m.color}-500`} />
                <span className="flex-1 truncate">{m.name}</span>
                {latest && (
                  <span className={`text-[10px] font-semibold ${
                    change >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Aggregate metric data into composite growth chart
function calculateGrowthChart(entries: any[], timeframe: string) {
  if (entries.length === 0) return []

  const grouped: Record<string, { total: number; count: number; label: string }> = {}

  entries.forEach(entry => {
    const date = new Date(entry.date)
    let key = ''
    let label = ''

    if (timeframe === 'week') {
      key = `${date.getFullYear()}-W${getWeekNumber(date)}`
      label = `W${getWeekNumber(date)}`
    } else if (timeframe === 'month') {
      key = `${date.getFullYear()}-${date.getMonth()}`
      label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    } else if (timeframe === 'quarter') {
      const q = Math.floor(date.getMonth() / 3) + 1
      key = `${date.getFullYear()}-Q${q}`
      label = `Q${q} '${date.getFullYear().toString().slice(-2)}`
    } else {
      key = `${date.getFullYear()}`
      label = date.getFullYear().toString()
    }

    if (!grouped[key]) {
      grouped[key] = { total: 0, count: 0, label }
    }
    
    // Normalize value based on metric type
    const normalizedValue = entry.venture_metrics?.type === 'percentage' 
      ? entry.value 
      : Math.log(entry.value + 1) * 10  // Log scale for large numbers
    
    grouped[key].total += normalizedValue
    grouped[key].count += 1
  })

  return Object.keys(grouped).sort().map(key => ({
    label: grouped[key].label,
    score: Math.round((grouped[key].total / grouped[key].count) * 10) / 10,
  }))
}

function calculateGrowthScore(entries: any[], timeframe: string) {
  const chart = calculateGrowthChart(entries, timeframe)
  const current = chart[chart.length - 1]?.score || 0
  const previous = chart[chart.length - 2]?.score || 0
  const change = previous > 0 ? ((current - previous) / previous * 100) : 0
  return { current, previous, change }
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}