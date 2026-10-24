'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Users, Sparkles, Building2, DollarSign, Rocket, TrendingUp, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { JoinButton } from './JoinButton'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  green: 'from-green-500 to-emerald-600',
  orange: 'from-orange-500 to-red-500',
  pink: 'from-pink-500 to-rose-500',
  red: 'from-red-500 to-red-600',
  cyan: 'from-cyan-500 to-blue-500',
  yellow: 'from-yellow-500 to-orange-500',
  gray: 'from-gray-500 to-gray-600',
}

const investorTypeIcons: Record<string, any> = {
  vc: DollarSign,
  accelerator: Rocket,
  angel: TrendingUp,
  grant: Building2,
  government: Building2,
}

interface CommunitiesDiscoveryProps {
  myCommunities: any[]
  allCommunities: any[]
  investors: any[]
  myCommunityIds: string[]
}

export function CommunitiesDiscovery({ 
  myCommunities, 
  allCommunities, 
  investors,
  myCommunityIds,
}: CommunitiesDiscoveryProps) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'communities' | 'investors' | 'my'>('communities')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const communityTypes = [
    { id: 'all', label: 'All' },
    { id: 'domain', label: 'Domains' },
    { id: 'institution', label: 'Institutions' },
  ]

  const filteredCommunities = allCommunities.filter(c => {
    const matchesSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || c.type === typeFilter
    return matchesSearch && matchesType
  })

  const filteredInvestors = investors.filter(i =>
    !search || 
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communities</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover builders in your domain, institution, and beyond
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search communities and investors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <div className="bg-card border rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setTab('my')}
          className={cn(
            'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
            tab === 'my'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          My Communities ({myCommunities.length})
        </button>
        <button
          onClick={() => setTab('communities')}
          className={cn(
            'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
            tab === 'communities'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Discover Communities
        </button>
        <button
          onClick={() => setTab('investors')}
          className={cn(
            'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
            tab === 'investors'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Investors & Grants
        </button>
      </div>

      {/* My Communities */}
      {tab === 'my' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myCommunities.length === 0 ? (
            <div className="col-span-full bg-card border rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">You have not joined any communities yet</p>
              <button
                onClick={() => setTab('communities')}
                className="text-sm text-blue-500 hover:underline mt-2"
              >
                Discover communities →
              </button>
            </div>
          ) : (
            myCommunities.map(c => (
              <CommunityCard key={c.id} community={c} isJoined={true} />
            ))
          )}
        </div>
      )}

      {/* Discover Communities */}
      {tab === 'communities' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {communityTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  typeFilter === t.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map(c => (
              <CommunityCard 
                key={c.id} 
                community={c} 
                isJoined={myCommunityIds.includes(c.id)} 
              />
            ))}
          </div>
        </>
      )}

      {/* Investors */}
      {tab === 'investors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInvestors.map(inv => (
            <InvestorCard key={inv.id} investor={inv} />
          ))}
        </div>
      )}
    </div>
  )
}

function CommunityCard({ community, isJoined }: any) {
  const color = colorMap[community.icon_color] || colorMap.blue

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors group"
    >
      <div className={cn('h-16 bg-gradient-to-br relative', color)}>
        <div className="absolute inset-0 bg-black/20" />
      </div>
      <div className="p-4 -mt-6 relative">
        <div className={cn(
          'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center border-4 border-background shadow-lg',
          color
        )}>
          <span className="text-lg text-white font-bold">
            {community.name?.[0]?.toUpperCase()}
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/community/${community.slug}`}
                  className="font-semibold text-sm hover:underline truncate"
                >
                  {community.name}
                </Link>
                {community.is_verified && (
                  <span className="text-blue-500 text-xs">✓</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground capitalize">
                {community.type} · {community.category || 'General'}
              </p>
            </div>
          </div>

          {community.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {community.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {community.member_count?.toLocaleString() || 0}
              </span>
              <span>·</span>
              <span>{community.post_count?.toLocaleString() || 0} posts</span>
            </div>
            <JoinButton
              communityId={community.id}
              initialJoined={isJoined}
              size="sm"
              showText={false}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function InvestorCard({ investor }: any) {
  const TypeIcon = investorTypeIcons[investor.type] || DollarSign

  const formatCheckSize = (min: number, max: number) => {
    if (!min && !max) return 'Varies'
    const format = (n: number) => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
      return `$${n}`
    }
    if (min === max) return format(min)
    return `${format(min)} - ${format(max)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl p-5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0">
            <TypeIcon className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm truncate">{investor.name}</h3>
              {investor.is_verified && <span className="text-blue-500 text-xs">✓</span>}
            </div>
            <p className="text-[10px] text-muted-foreground capitalize">
              {investor.type.replace('_', ' ')} · {investor.hq_location}
            </p>
          </div>
        </div>
        {investor.application_open && (
          <span className="text-[9px] px-2 py-0.5 bg-green-500/10 text-green-500 rounded-md font-bold uppercase tracking-wider whitespace-nowrap">
            Open
          </span>
        )}
      </div>

      {investor.description && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">
          {investor.description}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold">Check Size</p>
          <p className="font-bold mt-0.5">
            {formatCheckSize(investor.check_size_min, investor.check_size_max)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold">Stage</p>
          <p className="font-bold mt-0.5">
            {investor.stage?.[0] || 'Any'}
          </p>
        </div>
      </div>

      {investor.focus_areas?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {investor.focus_areas.slice(0, 5).map((area: string) => (
            <span key={area} className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-medium">
              {area}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        {investor.application_open && investor.application_url && (
          <a
            href={investor.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Apply
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {investor.website && (
          <a
            href={investor.website}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center gap-1 py-2 px-4 border rounded-lg text-xs font-semibold hover:bg-muted transition-colors',
              !investor.application_open && 'flex-1'
            )}
          >
            Website
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  )
}