'use client'

import { useState } from 'react'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Flame, Clock, FolderCheck, GitCommit, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface BuildAnalyticsProps {
  stats: any[]
  profile: any
  projectCount?: number
}

export function BuildAnalytics({ stats, profile, projectCount = 0 }: BuildAnalyticsProps) {
  const [timeframe, setTimeframe] = useState('This Week')

  const hasData = stats && stats.length > 0

  // Generate last 7 days
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()
  const chartData = days.map((day, idx) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - idx))
    const dateStr = date.toISOString().split('T')[0]
    const stat = stats?.find(s => s.date === dateStr)
    return {
      day,
      hours: stat?.hours || 0,
    }
  })

  const totalHours = chartData.reduce((sum, d) => sum + d.hours, 0)
  const totalCommits = stats?.reduce((sum, s) => sum + (s.commits || 0), 0) || 0
  const totalTasks = stats?.reduce((sum, s) => sum + (s.tasks_done || 0), 0) || 0

  const kpis = [
    { 
      key: 'streak', 
      label: 'Build Streak', 
      icon: Flame, 
      color: 'text-orange-400',
      value: profile?.streak_days || 0,
      suffix: 'Days' 
    },
    { 
      key: 'hours', 
      label: 'Total Hours', 
      icon: Clock, 
      color: 'text-blue-400',
      value: totalHours,
      suffix: 'Hours' 
    },
    { 
      key: 'projects', 
      label: 'Projects Active', 
      icon: FolderCheck, 
      color: 'text-purple-400',
      value: projectCount,
      suffix: '' 
    },
    { 
      key: 'tasks', 
      label: 'Tasks Done', 
      icon: TrendingUp, 
      color: 'text-green-400',
      value: totalTasks,
      suffix: '' 
    },
    { 
      key: 'commits', 
      label: 'Commits', 
      icon: GitCommit, 
      color: 'text-cyan-400',
      value: totalCommits,
      suffix: '' 
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-card border rounded-2xl p-6 space-y-4 lg:col-span-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.15em] font-bold">
          Build Analytics
        </p>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="text-xs bg-muted/40 border rounded-md px-2.5 py-1 focus:outline-none cursor-pointer hover:bg-muted/60 transition-colors"
        >
          <option>This Week</option>
          <option>This Month</option>
          <option>All Time</option>
        </select>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.key}
              className="bg-muted/30 rounded-xl p-3 border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                  {kpi.label}
                </p>
                <Icon className={cn('w-3.5 h-3.5', kpi.color)} strokeWidth={2.5} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums">
                  {kpi.value}
                </span>
                {kpi.suffix && (
                  <span className="text-[10px] text-muted-foreground">{kpi.suffix}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasData && totalHours > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="day" 
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
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fill="url(#colorHours)"
                dot={{ fill: 'hsl(217, 91%, 60%)', r: 3, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center text-center space-y-2 border border-dashed rounded-xl">
          <TrendingUp className="w-6 h-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">No analytics data yet</p>
          <p className="text-[10px] text-muted-foreground/70">
            Complete tasks and{' '}
            <Link href="/settings/integrations" className="text-blue-500 hover:underline">
              connect GitHub
            </Link>
            {' '}to see your build patterns
          </p>
        </div>
      )}
    </motion.div>
  )
}