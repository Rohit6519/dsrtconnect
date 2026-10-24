'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Rocket, Bookmark, TrendingUp, Target, DollarSign, Users, CheckCircle2 } from 'lucide-react'
import { DsrtPanel, DsrtSection, DsrtGrid, DsrtTabs, DsrtButton } from '@/components/dsrt'

interface InvestorDashboardProps {
  profile: any
  watchlist: any[]
  newVentures: any[]
  trending: any[]
  focusVentures: any[]
}

export function InvestorDashboard({
  profile, watchlist, newVentures, trending, focusVentures,
}: InvestorDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'watchlist' | 'new' | 'trending' | 'focus'>('overview')

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'watchlist', label: 'Watchlist', badge: watchlist.length },
    { value: 'focus', label: 'My Focus', badge: focusVentures.length },
    { value: 'new', label: 'New Ventures' },
    { value: 'trending', label: 'Trending' },
  ]

  return (
    <div className="space-y-6">
      <DsrtPanel variant="accent" padding="lg">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-white/70 font-bold">
                Investor Dashboard
              </p>
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-bold text-white tracking-tight">
              Welcome, {profile.full_name}
            </h1>
            <p className="text-[14px] text-white/70 mt-1 font-medium">
              {profile.investor_type || 'Angel Investor'}
              {profile.check_size && ` · Typical Check: ${profile.check_size}`}
            </p>
          </div>
          <DsrtButton asChild variant="white" size="sm">
            <Link href="/settings?tab=investor">Edit Profile</Link>
          </DsrtButton>
        </div>

        {profile.focus_sectors && profile.focus_sectors.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/50 py-1">Focus:</span>
            {profile.focus_sectors.map((s: string) => (
              <span key={s} className="px-2.5 py-1 text-[11px] font-semibold bg-white/[0.08] border border-white/20 text-white rounded-md shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                {s}
              </span>
            ))}
          </div>
        )}

        <DsrtGrid cols={{ base: 2, lg: 4 }} gap="sm" className="mt-8">
          <StatCard label="Watchlist" value={watchlist.length} icon={Bookmark} />
          <StatCard label="Focus Sectors" value={profile.focus_sectors?.length || 0} icon={Target} />
          <StatCard label="New This Week" value={newVentures.length} icon={Rocket} />
          <StatCard label="Portfolio" value={profile.portfolio_count || 0} icon={TrendingUp} />
        </DsrtGrid>
      </DsrtPanel>

      <div className="sticky top-[112px] z-20 bg-[#05070D]/95 backdrop-blur-md pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <DsrtTabs variant="underline" tabs={tabs} activeValue={tab} onValueChange={(v) => setTab(v as any)} />
      </div>

      {tab === 'overview' && (
        <DsrtGrid cols={{ base: 1, lg: 2 }} gap="lg">
          <DsrtPanel padding="none" className="overflow-hidden">
            <DsrtSection title="In Your Focus Sectors" headerVariant="mono" className="p-4 border-b border-white/[0.06]" />
            <div className="divide-y divide-white/[0.04]">
              {focusVentures.slice(0, 5).map((v) => <VentureRow key={v.id} venture={v} />)}
            </div>
          </DsrtPanel>
          <DsrtPanel padding="none" className="overflow-hidden">
            <DsrtSection title="Recently Added" headerVariant="mono" className="p-4 border-b border-white/[0.06]" />
            <div className="divide-y divide-white/[0.04]">
              {newVentures.slice(0, 5).map((v) => <VentureRow key={v.id} venture={v} />)}
            </div>
          </DsrtPanel>
        </DsrtGrid>
      )}

      {tab === 'watchlist' && (
        <DsrtPanel padding="none" className="overflow-hidden">
          {watchlist.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-[14px] text-white/50">Your watchlist is empty. Add ventures to track.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {watchlist.map((w) => <VentureRow key={w.id} venture={w.startups} />)}
            </div>
          )}
        </DsrtPanel>
      )}

      {tab === 'focus' && (
        <DsrtPanel padding="none" className="overflow-hidden">
          {focusVentures.length === 0 ? (
            <div className="text-center py-16">
              <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-[14px] text-white/50">No ventures match your focus sectors yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {focusVentures.map((v) => <VentureRow key={v.id} venture={v} />)}
            </div>
          )}
        </DsrtPanel>
      )}

      {tab === 'new' && (
        <DsrtPanel padding="none" className="overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {newVentures.map((v) => <VentureRow key={v.id} venture={v} />)}
          </div>
        </DsrtPanel>
      )}

      {tab === 'trending' && (
        <DsrtPanel padding="none" className="overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {trending.map((v) => <VentureRow key={v.id} venture={v} />)}
          </div>
        </DsrtPanel>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#05070D]/40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-white/50" />
        <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold font-mono">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function VentureRow({ venture }: any) {
  if (!venture) return null
  return (
    <Link
      href={`/ventures/${venture.slug}`}
      className="flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors group"
    >
      <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
        {venture.logo_url ? (
          <img src={venture.logo_url} alt="" className="w-full h-full rounded-xl object-cover" />
        ) : (
          <Rocket className="w-5 h-5 text-[#93c5fd]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-[14px] text-white truncate group-hover:text-[#93c5fd] transition-colors">{venture.name}</p>
          {venture.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#93c5fd]" />}
        </div>
        {venture.tagline && <p className="text-[12px] text-white/60 line-clamp-1 mt-0.5">{venture.tagline}</p>}
        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-white/40 uppercase tracking-wider">
          <span className="font-bold text-white/60">{venture.stage}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {venture.member_count}</span>
          {venture.category?.slice(0, 2).map((c: string) => (
            <span key={c} className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.1] rounded text-white/60">{c}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}