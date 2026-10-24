'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RocketLaunch, Plus, Buildings, Users, TrendUp, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { STAGES } from '@/lib/config/sectors'

interface VenturesListViewProps {
  myVentures: any[]
  allVentures: any[]
  currentUserId: string
}

export function VenturesListView({ myVentures, allVentures, currentUserId }: VenturesListViewProps) {
  const [tab, setTab] = useState<'mine' | 'discover'>('mine')

  const displayed = tab === 'mine' ? myVentures : allVentures

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <RocketLaunch className="w-5 h-5 text-white" weight="fill" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ventures</h1>
            <p className="text-sm text-muted-foreground">
              Real companies. Real progress. Built in public.
            </p>
          </div>
        </div>
        <Link href="/ventures/new">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
            <Plus className="w-4 h-4 mr-1" weight="bold" />
            New Venture
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-card border rounded-xl p-1 flex gap-1 w-fit">
        <button
          onClick={() => setTab('mine')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
            tab === 'mine' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          My Ventures ({myVentures.length})
        </button>
        <button
          onClick={() => setTab('discover')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
            tab === 'discover' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Discover Ventures
        </button>
      </div>

      {/* Ventures Grid */}
      {displayed.length === 0 ? (
        <div className="bg-card border rounded-2xl p-16 text-center">
          <RocketLaunch className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" weight="duotone" />
          <h2 className="text-lg font-bold">
            {tab === 'mine' ? 'No ventures yet' : 'No public ventures yet'}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {tab === 'mine' 
              ? 'Create your first venture to start tracking your journey'
              : 'Be the first to build in public on DSRT'
            }
          </p>
          <Link href="/ventures/new">
            <Button>
              <Plus className="w-4 h-4 mr-1" weight="bold" />
              Create Venture
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((venture, idx) => (
            <VentureCard 
              key={venture.id} 
              venture={venture} 
              index={idx}
              isOwn={venture.user_id === currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VentureCard({ venture, index, isOwn }: any) {
  const stage = STAGES.find(s => s.id === venture.stage) || STAGES[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/ventures/${venture.slug}`}
        className="block bg-card border rounded-2xl p-5 hover:border-primary/30 transition-all group hover:shadow-lg"
      >
        <div className="flex items-start gap-3 mb-3">
          {venture.logo_url ? (
            <img
              src={venture.logo_url}
              alt={venture.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {venture.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                {venture.name}
              </h3>
              {venture.is_verified && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" weight="fill" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {venture.industry} · {venture.sub_category}
            </p>
          </div>
        </div>

        {venture.tagline && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {venture.tagline}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={cn(
            'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border',
            stage.color
          )}>
            {stage.label}
          </span>
          {venture.is_building_public && (
            <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded font-bold uppercase tracking-wider border border-blue-500/30">
              Building in Public
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-3 border-t">
          {venture.headquarters && (
            <span className="flex items-center gap-1">
              <Buildings className="w-3 h-3" weight="duotone" />
              {venture.headquarters}
            </span>
          )}
          {venture.team_size && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" weight="duotone" />
              {venture.team_size}
            </span>
          )}
          {venture.follower_count > 0 && (
            <span className="flex items-center gap-1 ml-auto">
              <TrendUp className="w-3 h-3" weight="duotone" />
              {venture.follower_count}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  )
}