'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Envelope, Buildings, Users, Kanban as FolderKanban, UserPlus, Check, X, Clock,
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { DsrtPage, DsrtSection, DsrtPanel, DsrtButton, DsrtTabs, DsrtEmpty, DsrtAvatar, DsrtChip } from '@/components/dsrt'

export function InvitationsPage({ currentUser }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'organizations' | 'communities' | 'projects' | 'connections'>('all')
  const [data, setData] = useState<{ organizations: any[]; communities: any[]; projects: any[]; connections: any[] }>({
    organizations: [], communities: [], projects: [], connections: [],
  })
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/invitations')
      const d = await res.json()
      setData({
        organizations: d.organizations || [],
        communities: d.communities || [],
        projects: d.projects || [],
        connections: d.connections || [],
      })
    } catch {
      toast.error('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  const handle = async (type: string, id: string, action: 'accept' | 'decline') => {
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_type: type, invitation_id: id, action }),
      })
      if (res.ok) {
        toast.success(action === 'accept' ? 'Invitation accepted' : 'Invitation declined')
        setData(prev => ({
          ...prev,
          [type + 's']: prev[(type + 's') as keyof typeof prev].filter((i: any) => i.id !== id),
        }))
      } else {
        toast.error('Failed to respond')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const total = data.organizations.length + data.communities.length + data.projects.length + data.connections.length

  const tabs = [
    { value: 'all', label: 'All', badge: total || undefined },
    { value: 'organizations', label: 'Orgs', badge: data.organizations.length || undefined },
    { value: 'communities', label: 'Communities', badge: data.communities.length || undefined },
    { value: 'projects', label: 'Projects', badge: data.projects.length || undefined },
    { value: 'connections', label: 'Connections', badge: data.connections.length || undefined },
  ]

  return (
    <DsrtPage width="default" className="space-y-6 py-6">
      <DsrtSection
        title="Invitations"
        description={total === 0 
          ? 'You have no pending invitations' 
          : `${total} pending invitation${total > 1 ? 's' : ''} awaiting your response.`}
        headerVariant="large"
      />

      {/* Tabs - UPDATED: sticky top-[116px] md:top-[64px] */}
      <div className="sticky top-[116px] md:top-[64px] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 py-2">
        <DsrtTabs
          variant="underline"
          tabs={tabs}
          activeValue={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <DsrtPanel key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <DsrtPanel>
          <DsrtEmpty
            icon={Envelope}
            title="All caught up"
            description="No pending invitations right now. Explore DSRT to build your network."
            action={
              <DsrtButton asChild variant="outline" size="sm">
                <Link href="/community">Explore Communities</Link>
              </DsrtButton>
            }
          />
        </DsrtPanel>
      ) : (
        <div className="space-y-3">
          {(activeTab === 'all' || activeTab === 'organizations') && data.organizations.map((inv, i) => (
            <InvitationCard
              key={inv.id}
              type="organization"
              icon={Buildings}
              title={inv.organizations?.name}
              subtitle="Organization invitation"
              logo={inv.organizations?.logo_url}
              logoName={inv.organizations?.name}
              description={inv.organizations?.description}
              inviter={inv.inviter}
              message={inv.message}
              role={inv.role}
              createdAt={inv.created_at}
              index={i}
              onAccept={() => handle('organization', inv.id, 'accept')}
              onDecline={() => handle('organization', inv.id, 'decline')}
              processing={processingIds.has(inv.id)}
              detailLink={inv.organizations?.slug ? `/organizations/${inv.organizations.slug}` : undefined}
            />
          ))}
          {(activeTab === 'all' || activeTab === 'communities') && data.communities.map((inv, i) => (
            <InvitationCard
              key={inv.id}
              type="community"
              icon={Users}
              title={inv.communities?.name}
              subtitle={`${inv.communities?.member_count || 0} members`}
              logo={inv.communities?.cover_url}
              logoName={inv.communities?.name}
              description={inv.communities?.description}
              inviter={inv.inviter}
              message={inv.message}
              role={inv.role}
              createdAt={inv.created_at}
              index={i}
              onAccept={() => handle('community', inv.id, 'accept')}
              onDecline={() => handle('community', inv.id, 'decline')}
              processing={processingIds.has(inv.id)}
              detailLink={inv.communities?.slug ? `/community/${inv.communities.slug}` : undefined}
            />
          ))}
          {(activeTab === 'all' || activeTab === 'projects') && data.projects.map((inv, i) => (
            <InvitationCard
              key={inv.id}
              type="project"
              icon={FolderKanban}
              title={inv.projects?.name}
              subtitle={`Role: ${inv.role || 'Member'}`}
              logoName={inv.projects?.name}
              description={inv.projects?.description}
              inviter={inv.inviter}
              role={inv.role}
              createdAt={inv.created_at}
              index={i}
              onAccept={() => handle('project', inv.id, 'accept')}
              onDecline={() => handle('project', inv.id, 'decline')}
              processing={processingIds.has(inv.id)}
              detailLink={inv.projects?.slug ? `/projects/${inv.projects.slug}` : undefined}
            />
          ))}
          {(activeTab === 'all' || activeTab === 'connections') && data.connections.map((inv, i) => (
            <InvitationCard
              key={inv.id}
              type="connection"
              icon={UserPlus}
              title={inv.requester?.full_name}
              subtitle={inv.requester?.tagline || 'Wants to connect'}
              logo={inv.requester?.avatar_url}
              logoName={inv.requester?.full_name}
              description={inv.message}
              createdAt={inv.created_at}
              index={i}
              onAccept={() => handle('connection', inv.id, 'accept')}
              onDecline={() => handle('connection', inv.id, 'decline')}
              processing={processingIds.has(inv.id)}
              detailLink={inv.requester?.username ? `/profile/${inv.requester.username}` : undefined}
            />
          ))}
        </div>
      )}
    </DsrtPage>
  )
}

function InvitationCard({
  type, icon: Icon, title, subtitle, logo, logoName, description,
  inviter, message, role, createdAt, index, onAccept, onDecline, processing, detailLink,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <DsrtPanel padding="md" className="hover:border-white/[0.14] transition-colors">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Logo */}
          {logo ? (
            <DsrtAvatar src={logo} name={logoName} size="lg" />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" weight="fill" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
              <div className="min-w-0 flex-1">
                {detailLink ? (
                  <Link href={detailLink} className="text-[14px] sm:text-[15px] font-bold text-white hover:text-[#93c5fd] transition-colors truncate block">
                    {title}
                  </Link>
                ) : (
                  <p className="text-[14px] sm:text-[15px] font-bold text-white truncate">{title}</p>
                )}
                <p className="text-[12px] text-white/50 truncate mt-0.5">{subtitle}</p>
              </div>
              <DsrtChip size="sm" tone="accent">
                {type}
              </DsrtChip>
            </div>

            {description && (
              <p className="text-[12.5px] text-white/60 line-clamp-2 leading-relaxed mt-2">
                {description}
              </p>
            )}

            {(inviter || message) && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                {inviter && (
                  <p className="text-[11px] text-white/50 mb-1">
                    Invited by <span className="font-semibold text-white/80">{inviter.full_name}</span>
                  </p>
                )}
                {message && (
                  <p className="text-[12px] italic text-white/60 leading-relaxed">
                    &ldquo;{message}&rdquo;
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-3 border-t border-white/[0.04]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(createdAt), { addSuffix: false })} ago
              </p>
              <div className="flex gap-2">
                <DsrtButton size="xs" variant="outline" onClick={onDecline} disabled={processing}>
                  <X className="w-3 h-3" weight="bold" /> Decline
                </DsrtButton>
                <DsrtButton size="xs" variant="primary" onClick={onAccept} loading={processing}>
                  <Check className="w-3 h-3" weight="bold" /> {processing ? 'Processing...' : 'Accept'}
                </DsrtButton>
              </div>
            </div>
          </div>
        </div>
      </DsrtPanel>
    </motion.div>
  )
}