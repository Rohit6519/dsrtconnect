'use client'

import { Users, Sparkles, Mail, UsersRound } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { LoadingState } from '@/components/kernel-ui'
import type { NetworkSummary } from '@/hooks/useCommunityNetwork'

interface Props {
  summary: NetworkSummary | null
  loading: boolean
  onNavigate: (bucket: 'joined' | 'following' | 'invited' | 'people') => void
}

export function NetworkSummaryStrip({ summary, loading, onNavigate }: Props) {
  if (loading || !summary) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <LoadingState label="Loading your network…" variant="compact" />
      </div>
    )
  }

  const tiles = [
    {
      key: 'joined',
      label: 'Communities',
      value: summary.joined_count,
      icon: UsersRound,
      onClick: () => onNavigate('joined'),
    },
    {
      key: 'following',
      label: 'Following',
      value: summary.following_count,
      icon: Sparkles,
      onClick: () => onNavigate('following'),
    },
    {
      key: 'invited',
      label: 'Pending invitations',
      value: summary.pending_invitation_count,
      icon: Mail,
      onClick: () => onNavigate('invited'),
      highlight: summary.pending_invitation_count > 0,
    },
    {
      key: 'people',
      label: 'People met',
      value: summary.peers_count,
      icon: Users,
      onClick: () => onNavigate('people'),
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      {tiles.map((t) => (
        <button
          key={t.key}
          onClick={t.onClick}
          className={cn(
            'group text-left rounded-2xl border p-4 transition-colors',
            'border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01]',
            'hover:border-white/[0.14] hover:from-white/[0.05]',
            t.highlight && 'border-white/[0.14]'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.04] flex items-center justify-center">
              <t.icon className="w-4 h-4 text-white/70" strokeWidth={1.75} />
            </div>
            {t.highlight && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/70">
                Needs attention
              </span>
            )}
          </div>
          <p className="text-[24px] font-semibold text-white leading-none numeric">
            {formatNumber(t.value)}
          </p>
          <p className="mt-1.5 text-[11.5px] font-mono uppercase tracking-wider text-white/45">
            {t.label}
          </p>
        </button>
      ))}
    </div>
  )
}