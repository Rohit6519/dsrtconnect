'use client'

import { ProfileCard } from '../../shared/ProfileCard'
import { cn } from '@/lib/utils'
import {
  Rocket,
  Users,
  Lightning,
  CurrencyDollar,
  UsersFour,
} from '@phosphor-icons/react'

interface FounderStats {
  total_ventures: number
  active_ventures: number
  total_followers: number
  total_team_members: number
  total_funding_rounds: number
}

interface FounderStatsBarProps {
  stats: FounderStats
}

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function FounderStatsBar({ stats }: FounderStatsBarProps) {
  const items = [
    {
      label: 'Ventures',
      value: stats.total_ventures,
      icon: <Rocket className="w-4 h-4" weight="fill" />,
      color: 'text-orange-300',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      label: 'Active',
      value: stats.active_ventures,
      icon: <Lightning className="w-4 h-4" weight="fill" />,
      color: 'text-green-300',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'Team',
      value: stats.total_team_members,
      icon: <UsersFour className="w-4 h-4" weight="fill" />,
      color: 'text-purple-300',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Followers',
      value: stats.total_followers,
      icon: <Users className="w-4 h-4" weight="fill" />,
      color: 'text-blue-300',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      big: true,
    },
    {
      label: 'Funding Rounds',
      value: stats.total_funding_rounds,
      icon: <CurrencyDollar className="w-4 h-4" weight="fill" />,
      color: 'text-yellow-300',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      hidden: stats.total_funding_rounds === 0,
    },
  ].filter((item) => !item.hidden)

  return (
    <ProfileCard className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-2.5 p-2.5 rounded-xl border',
              item.bg,
              item.border,
            )}
          >
            <div className={cn('flex-shrink-0', item.color)}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-white leading-none tabular-nums">
                {item.big ? formatBigNumber(item.value) : item.value.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-0.5">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ProfileCard>
  )
}