'use client'

import { Shield, Github, Linkedin, Twitter, Award, Zap, Flame, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Badge {
  id: string
  label: string
  icon: any
  color: string
  earned: boolean
  description: string
}

interface TrustBadgesProps {
  profile: any
  integrations?: any[]
  stats?: {
    projectCount?: number
    postCount?: number
  }
}

export function TrustBadges({ profile, integrations = [], stats = {} }: TrustBadgesProps) {
  const hasIntegration = (provider: string) => 
    integrations.some((i: any) => i.provider === provider && i.is_active)

  const badges: Badge[] = [
    {
      id: 'verified',
      label: 'Verified',
      icon: Shield,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      earned: profile.is_verified,
      description: 'Verified DSRT member',
    },
    {
      id: 'github',
      label: 'GitHub Connected',
      icon: Github,
      color: 'text-gray-100 bg-gray-800 border-gray-700',
      earned: hasIntegration('github') || !!profile.github_url,
      description: 'GitHub account connected',
    },
    {
      id: 'streak',
      label: `${profile.streak_days || 0} Day Streak`,
      icon: Flame,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
      earned: (profile.streak_days || 0) >= 7,
      description: '7+ day building streak',
    },
    {
      id: 'shipper',
      label: 'Shipper',
      icon: Zap,
      color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
      earned: (profile.products_shipped || 0) >= 1,
      description: 'Shipped at least 1 product',
    },
    {
      id: 'popular',
      label: 'Popular',
      icon: Star,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
      earned: (profile.follower_count || 0) >= 50,
      description: '50+ followers',
    },
    {
      id: 'top_performer',
      label: 'Top Performer',
      icon: Award,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
      earned: (profile.execution_score || 0) >= 500,
      description: 'High execution score',
    },
  ]

  const earnedBadges = badges.filter(b => b.earned)

  if (earnedBadges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {earnedBadges.map(badge => {
        const Icon = badge.icon
        return (
          <div
            key={badge.id}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border',
              badge.color
            )}
            title={badge.description}
          >
            <Icon className="w-3 h-3" strokeWidth={2.5} />
            {badge.label}
          </div>
        )
      })}
    </div>
  )
}