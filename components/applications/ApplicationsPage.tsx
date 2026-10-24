'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ClipboardText as ClipboardList,
  MagnifyingGlass, ShieldCheck, Clock, Check, X,
  ArrowRight, FileText, Link as LinkIcon, GithubLogo,
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending:     { label: 'Pending Review', color: 'yellow', icon: Clock },
  reviewing:   { label: 'Under Review', color: 'blue', icon: ClipboardList },
  shortlisted: { label: 'Shortlisted', color: 'purple', icon: ShieldCheck },
  accepted:    { label: 'Accepted', color: 'green', icon: Check },
  rejected:    { label: 'Not Selected', color: 'red', icon: X },
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  blue:   { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  green:  { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  red:    { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
}

export function ApplicationsPage({ currentUser }: any) {
  const [activeTab, setActiveTab] = useState<'looking_for' | 'moderator'>('looking_for')
  const [lookingFor, setLookingFor] = useState<any[]>([])
  const [moderator, setModerator] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/applications')
      const data = await res.json()
      setLookingFor(data.looking_for || [])
      setModerator(data.moderator || [])
      setLoading(false)
    }
    load()
  }, [])

  const total = lookingFor.length + moderator.length

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-green-500" weight="fill" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
            <p className="text-sm text-muted-foreground">
              {total === 0 ? 'You haven\'t applied to anything yet' : `${total} active application${total > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
        {[
          { id: 'looking_for', label: 'Looking For', count: lookingFor.length, icon: MagnifyingGlass },
          { id: 'moderator', label: 'Moderator Roles', count: moderator.length, icon: ShieldCheck },
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/30 rounded-2xl animate-pulse" />)}
        </div>
      ) : activeTab === 'looking_for' ? (
        lookingFor.length === 0 ? (
          <EmptyState
            icon={MagnifyingGlass}
            title="No applications yet"
            desc="Apply to roles from Looking For posts to track them here"
            actionHref="/looking-for"
            actionLabel="Browse Opportunities"
          />
        ) : (
          <div className="space-y-3">
            {lookingFor.map((app, i) => <LookingForAppCard key={app.id} app={app} index={i} />)}
          </div>
        )
      ) : (
        moderator.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No moderator applications"
            desc="Apply for moderator roles in communities you care about"
            actionHref="/community"
            actionLabel="Discover Communities"
          />
        ) : (
          <div className="space-y-3">
            {moderator.map((app, i) => <ModeratorAppCard key={app.id} app={app} index={i} />)}
          </div>
        )
      )}
    </div>
  )
}

function LookingForAppCard({ app, index }: any) {
  const status = STATUS_MAP[app.status] || STATUS_MAP.pending
  const colors = COLOR_MAP[status.color]
  const StatusIcon = status.icon
  const venture = app.venture_lf?.ventures
  const roleTitle = app.venture_lf?.title || app.posts?.title || 'Role'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border rounded-2xl p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {venture?.logo_url ? (
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={venture.logo_url} />
            <AvatarFallback className="rounded-xl">{venture.name?.[0]}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <MagnifyingGlass className="w-6 h-6 text-green-500" weight="fill" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{roleTitle}</p>
              {venture && (
                <Link href={`/ventures/${venture.slug}`} className="text-xs text-muted-foreground hover:text-primary hover:underline truncate block">
                  at {venture.name}
                </Link>
              )}
            </div>
            <span className={cn(
              'text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1',
              colors.bg, colors.text
            )}>
              <StatusIcon className="w-3 h-3" weight="fill" />
              {status.label}
            </span>
          </div>

          {app.message && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-2 italic">&quot;{app.message}&quot;</p>
          )}

          <div className="flex items-center gap-3 mt-3 text-[10px]">
            {app.resume_url && (
              <a href={app.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                <FileText className="w-3 h-3" /> Resume
              </a>
            )}
            {app.portfolio_url && (
              <a href={app.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                <LinkIcon className="w-3 h-3" /> Portfolio
              </a>
            )}
            {app.github_url && (
              <a href={app.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                <GithubLogo className="w-3 h-3" /> GitHub
              </a>
            )}
          </div>

          {app.reviewer_notes && (
            <div className="mt-3 pt-3 border-t border-dashed">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Reviewer Notes</p>
              <p className="text-xs text-muted-foreground">{app.reviewer_notes}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <p className="text-[10px] text-muted-foreground">
              Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: false })} ago
            </p>
            {venture && (
              <Link href={`/ventures/${venture.slug}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                View venture <ArrowRight className="w-3 h-3" weight="bold" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ModeratorAppCard({ app, index }: any) {
  const status = STATUS_MAP[app.status] || STATUS_MAP.pending
  const colors = COLOR_MAP[status.color]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border rounded-2xl p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        {app.communities?.cover_url ? (
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={app.communities.cover_url} />
            <AvatarFallback className="rounded-xl">{app.communities.name?.[0]}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-purple-500" weight="fill" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-bold">{app.communities?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">Applied for: {app.role_type}</p>
            </div>
            <span className={cn(
              'text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1',
              colors.bg, colors.text
            )}>
              <StatusIcon className="w-3 h-3" weight="fill" />
              {status.label}
            </span>
          </div>
          {app.motivation && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{app.motivation}</p>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <p className="text-[10px] text-muted-foreground">
              Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: false })} ago
            </p>
            {app.communities?.slug && (
              <Link href={`/community/${app.communities.slug}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                View community <ArrowRight className="w-3 h-3" weight="bold" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ icon: Icon, title, desc, actionHref, actionLabel }: any) {
  return (
    <div className="bg-card border rounded-2xl p-12 text-center">
      <Icon className="w-14 h-14 mx-auto text-muted-foreground/30 mb-3" weight="duotone" />
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <Link href={actionHref}>
        <Button variant="outline" size="sm" className="mt-4">{actionLabel}</Button>
      </Link>
    </div>
  )
}