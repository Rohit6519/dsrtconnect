'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { StudioShell, LoadingState, ForbiddenState } from '@/components/kernel-ui'
import {
  LayoutDashboard, Users, UserCheck, Mail, Shield, ScrollText,
  Settings, History, MessageSquare, Menu, ArrowLeft
} from 'lucide-react'
import { useCommunityDetail } from '@/hooks/useCommunityDetail'
import { DsrtSheet, DsrtButton, DsrtPanel, DsrtEmpty, DsrtPage } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Props {
  slug: string
  activeKey: string
  children: React.ReactNode
}

export function StudioConsoleShell({ slug, activeKey, children }: Props) {
  const pathname = usePathname()
  const { data, loading, error } = useCommunityDetail(slug)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [invitationCount, setInvitationCount] = useState<number>(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!data) return
    fetch(`/api/v1/community/${slug}/studio/overview`)
      .then((r) => r.json())
      .then((j) => {
        setPendingCount(j?.data?.counts?.pending_applications ?? 0)
        setInvitationCount(j?.data?.counts?.pending_invitations ?? 0)
      })
      .catch(() => {})
  }, [slug, data])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070D] flex items-center justify-center">
        <LoadingState label="Loading Studio…" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <DsrtPage width="narrow" className="min-h-screen flex items-center justify-center">
        <DsrtPanel>
          <ForbiddenState
            title="Studio unavailable"
            description="We could not load Studio for this community."
            actionLabel="Back to community"
            actionHref={`/community/${slug}`}
          />
        </DsrtPanel>
      </DsrtPage>
    )
  }

  const caps = data.capabilities
  if (!caps.is_admin && !caps.is_owner && !caps.is_moderator) {
    return (
      <DsrtPage width="narrow" className="min-h-screen flex items-center justify-center">
        <DsrtPanel>
          <ForbiddenState
            title="Access Denied"
            description="Only admins, moderators, and owners can open the Community Studio."
            actionLabel="Back to community"
            actionHref={`/community/${slug}`}
          />
        </DsrtPanel>
      </DsrtPage>
    )
  }

  const base = `/community/${slug}/studio`

  const navGroups = [
    {
      label: 'Command Center',
      items: [{ label: 'Overview', href: base, icon: LayoutDashboard }],
    },
    {
      label: 'People',
      items: [
        { label: 'Members', href: `${base}/members`, icon: Users },
        { label: 'Applications', href: `${base}/applications`, icon: UserCheck, badge: pendingCount || undefined },
        { label: 'Invitations', href: `${base}/invitations`, icon: Mail, badge: invitationCount || undefined },
        { label: 'Roles & Permissions', href: `${base}/roles`, icon: Shield },
      ],
    },
    {
      label: 'Governance',
      items: [
        { label: 'Rules', href: `${base}/rules`, icon: ScrollText },
        { label: 'Moderation', href: `${base}/moderation`, icon: Shield },
        { label: 'Appeals', href: `${base}/moderation/appeals`, icon: MessageSquare },
        { label: 'Audit log', href: `${base}/audit`, icon: History },
      ],
    },
    {
      label: 'Configuration',
      items: [{ label: 'Settings', href: `${base}/settings`, icon: Settings }],
    },
  ]

  const flatItems = navGroups.flatMap((g) => g.items)
  const activeItem = flatItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/')) || flatItems[0]

  return (
    <div className="bg-[#05070D]">
      {/* Mobile Nav Topbar */}
      <div className="md:hidden sticky top-0 z-40 bg-[#05070D]/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white truncate leading-tight tracking-tight">{data.community.name}</p>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#93c5fd] truncate mt-0.5">
            {activeItem?.label || 'Studio'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DsrtButton asChild size="xs" variant="ghost" className="hidden sm:flex">
            <Link href={`/community/${slug}`}>Exit</Link>
          </DsrtButton>
          <DsrtButton size="xs" variant="outline" onClick={() => setMobileNavOpen(true)}>
            <Menu className="w-3.5 h-3.5" />
            Menu
          </DsrtButton>
        </div>
      </div>

      <div className="hidden md:block">
        <StudioShell
          title={data.community.name}
          subtitle="Community Studio"
          exitHref={`/community/${slug}`}
          exitLabel="Back to community"
          navGroups={navGroups}
        >
          {children}
        </StudioShell>
      </div>
      
      {/* Mobile content renderer */}
      <div className="md:hidden p-4">
        {children}
      </div>

      <DsrtSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        title="Studio Navigation"
        snap="full"
      >
        <div className="space-y-6 pb-6 pt-2">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40 px-2 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors',
                        active
                          ? 'bg-gradient-to-b from-[#1e3a5f] to-[#2c5282] text-white border border-[#2c5282]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                          : 'text-white/60 hover:bg-white/[0.04] hover:text-white border border-transparent'
                      )}
                    >
                      {Icon && <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge !== 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white min-w-[20px] text-center">
                          {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-white/[0.06]">
            <DsrtButton asChild variant="outline" fullWidth>
              <Link href={`/community/${slug}`}>
                <ArrowLeft size={14} className="mr-1.5" /> Back to Community
              </Link>
            </DsrtButton>
          </div>
        </div>
      </DsrtSheet>
    </div>
  )
}