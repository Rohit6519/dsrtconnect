'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Rocket,
  Users,
  ArrowSquareOut,
  Star,
  TrendUp,
  CurrencyDollar,
  ChartLineUp,
  Buildings,
  Calendar,
} from '@phosphor-icons/react'

interface FounderVenture {
  id: string
  name: string
  slug: string
  tagline?: string | null
  description?: string | null
  stage?: string | null
  status?: string | null
  logo_url?: string | null
  industry?: string | null
  sector?: string | null
  follower_count?: number | null
  is_featured?: boolean
  created_at?: string
  team_size: number
  recent_growth: Array<{
    metric_name: string
    value: number
    unit?: string
    recorded_at?: string
  }>
  funding_rounds: Array<{
    round_type: string
    amount?: number
    currency?: string
    raised_at?: string
    investors?: any
  }>
}

const STAGE_COLORS: Record<string, string> = {
  idea:         'bg-zinc-800/60 text-zinc-400 border-zinc-700/60',
  pre_seed:     'bg-blue-500/10 text-blue-300 border-blue-500/30',
  seed:         'bg-purple-500/10 text-purple-300 border-purple-500/30',
  series_a:     'bg-orange-500/10 text-orange-300 border-orange-500/30',
  series_b:     'bg-green-500/10 text-green-300 border-green-500/30',
  growth:       'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  bootstrapped: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
}

function stageStyle(stage?: string | null): string {
  const key = (stage || '').toLowerCase().replace(/\s+/g, '_')
  return STAGE_COLORS[key] || STAGE_COLORS.idea
}

function formatCurrency(amount: number, currency = 'USD'): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ${currency}`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K ${currency}`
  return `${amount} ${currency}`
}

interface FounderVentureCardProps {
  venture: FounderVenture
}

export function FounderVentureCard({ venture }: FounderVentureCardProps) {
  const totalFunding = venture.funding_rounds.reduce(
    (sum, r) => sum + (r.amount || 0),
    0,
  )

  return (
    <div className="bg-gradient-to-b from-zinc-900/40 via-zinc-950/40 to-zinc-950/60 border border-zinc-800/60 rounded-2xl shadow-[0_1px_0_rgba(255,255,255,0.025)_inset,0_2px_10px_rgba(0,0,0,0.25)] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3 border-b border-zinc-800/40">
        {/* Logo */}
        <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {venture.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venture.logo_url}
              alt={venture.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <Rocket className="w-6 h-6 text-orange-300" weight="fill" />
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/ventures/${venture.slug}`}
              className="text-[15px] font-bold text-white tracking-tight hover:underline"
            >
              {venture.name}
            </Link>
            {venture.is_featured && (
              <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" weight="fill" />
            )}
            {venture.stage && (
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border',
                stageStyle(venture.stage),
              )}>
                {venture.stage.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {venture.tagline && (
            <p className="text-[12.5px] text-zinc-400 mt-0.5 leading-snug">
              {venture.tagline}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10.5px] text-zinc-600">
            {venture.industry && (
              <span className="flex items-center gap-1">
                <Buildings className="w-2.5 h-2.5" weight="duotone" />
                {venture.industry}
              </span>
            )}
            {venture.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" weight="duotone" />
                Founded {format(new Date(venture.created_at), 'MMM yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Visit button */}
        <Link
          href={`/ventures/${venture.slug}`}
          className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors flex-shrink-0"
          title="Open venture"
        >
          Visit
          <ArrowSquareOut className="w-3 h-3" weight="bold" />
        </Link>
      </div>

      {/* Stats row */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <StatBox
          icon={<Users className="w-3.5 h-3.5" weight="duotone" />}
          label="Team"
          value={venture.team_size.toString()}
          color="text-purple-300"
        />
        <StatBox
          icon={<TrendUp className="w-3.5 h-3.5" weight="duotone" />}
          label="Followers"
          value={(venture.follower_count || 0).toLocaleString()}
          color="text-blue-300"
        />
        {totalFunding > 0 ? (
          <StatBox
            icon={<CurrencyDollar className="w-3.5 h-3.5" weight="duotone" />}
            label="Raised"
            value={formatCurrency(totalFunding, venture.funding_rounds[0]?.currency || 'USD')}
            color="text-yellow-300"
          />
        ) : (
          <StatBox
            icon={<ChartLineUp className="w-3.5 h-3.5" weight="duotone" />}
            label="Stage"
            value={venture.stage ? venture.stage.replace(/_/g, ' ') : 'N/A'}
            color="text-orange-300"
          />
        )}
      </div>

      {/* Recent growth metrics (if any) */}
      {venture.recent_growth.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-2">
            Recent Metrics
          </p>
          <div className="space-y-1.5">
            {venture.recent_growth.slice(0, 3).map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60"
              >
                <span className="text-[11.5px] text-zinc-400 capitalize truncate">
                  {g.metric_name.replace(/_/g, ' ')}
                </span>
                <span className="text-[12px] font-bold text-zinc-200 tabular-nums flex-shrink-0">
                  {g.value.toLocaleString()}
                  {g.unit && <span className="text-[10px] text-zinc-500 ml-1">{g.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funding rounds (if any) */}
      {venture.funding_rounds.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-2">
            Funding History
          </p>
          <div className="space-y-1.5">
            {venture.funding_rounds.slice(0, 3).map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 font-bold uppercase tracking-wider flex-shrink-0">
                    {r.round_type}
                  </span>
                  {r.raised_at && (
                    <span className="text-[10px] text-zinc-600">
                      {format(new Date(r.raised_at), 'MMM yyyy')}
                    </span>
                  )}
                </div>
                {r.amount && (
                  <span className="text-[12px] font-bold text-zinc-200 tabular-nums flex-shrink-0">
                    {formatCurrency(r.amount, r.currency)}
                  </span>
                )}
              </div>
            ))}
            {venture.funding_rounds.length > 3 && (
              <p className="text-[10px] text-zinc-600 text-center">
                +{venture.funding_rounds.length - 3} more rounds
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stat Box ─────────────────────────────────────────────────────────

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="px-2.5 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800/40">
      <div className={cn('flex items-center gap-1 mb-0.5', color)}>
        {icon}
        <span className="text-[9.5px] uppercase tracking-wider font-bold text-zinc-600">
          {label}
        </span>
      </div>
      <p className="text-[13px] font-bold text-white tabular-nums truncate">
        {value}
      </p>
    </div>
  )
}