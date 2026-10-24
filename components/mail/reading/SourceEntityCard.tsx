'use client'

import Link from 'next/link'
import { Buildings, Rocket, Briefcase, User, ArrowRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  entityType: string
  entity: any
}

const CONFIG: Record<string, { 
  icon: any
  color: string
  bg: string
  border: string
  label: string
}> = {
  venture: { 
    icon: Buildings, color: 'text-violet-400', 
    bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Venture' 
  },
  project: { 
    icon: Rocket, color: 'text-emerald-400', 
    bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Project' 
  },
  opportunity: { 
    icon: Briefcase, color: 'text-amber-400', 
    bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Opportunity' 
  },
  user: { 
    icon: User, color: 'text-blue-400', 
    bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Person' 
  },
}

export function SourceEntityCard({ entityType, entity }: Props) {
  if (!entity) return null

  const config = CONFIG[entityType] || CONFIG.user
  const Icon = config.icon

  let href = '#'
  let title = ''
  let subtitle = ''
  let imgUrl = null

  if (entityType === 'venture') {
    href = `/ventures/${entity.slug}`
    title = entity.name
    subtitle = entity.tagline || `${entity.industry || ''} ${entity.stage || ''}`.trim() || 'Venture'
    imgUrl = entity.logo_url
  } else if (entityType === 'project') {
    href = `/projects/${entity.slug}`
    title = entity.name
    subtitle = entity.tagline || `${entity.sector || ''} ${entity.status || ''}`.trim() || 'Project'
    imgUrl = entity.logo_url
  } else if (entityType === 'opportunity') {
    href = `/looking-for/${entity.id}`
    title = entity.title
    subtitle = entity.opportunity_type || entity.location || 'Opportunity'
  } else if (entityType === 'user') {
    href = `/profile/${entity.username}`
    title = entity.full_name || entity.username
    subtitle = entity.tagline || 'DSRT member'
    imgUrl = entity.avatar_url
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 p-3.5 rounded-xl mt-1 transition-colors",
        "bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06]",
        "hover:border-white/[0.15] hover:from-white/[0.05] hover:to-white/[0.02]"
      )}
    >
      <div className={cn(
        "w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] border flex items-center justify-center flex-shrink-0",
        config.border
      )}>
        {imgUrl ? (
          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-5 h-5", config.color)} weight="fill" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-wider", 
          config.color
        )}>
          {config.label}
        </span>
        <p className="text-[13.5px] font-bold text-white truncate leading-tight">{title}</p>
        <p className="text-[11.5px] text-white/50 truncate mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" weight="bold" />
    </Link>
  )
}