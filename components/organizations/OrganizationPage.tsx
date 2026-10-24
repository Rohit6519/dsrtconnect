'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  CheckCircle, Users, MapPin, Globe, Calendar, ShareNetwork,
  Plus, PencilSimple, DotsThree, ArrowRight, ArrowsClockwise,
  Sparkle, Trophy, Rocket, Code, MagnifyingGlass, ChatCircle,
  Lightbulb, UserPlus, Envelope, CurrencyInr, X, Heart,
  BookmarkSimple, Info, Buildings, GraduationCap, Star,
  Megaphone, ChartBar, FileText, Video, Link as LinkIcon,
  CaretDown, Check, Brain, Robot, GitBranch, PaintBrush,
  LinkSimple, House,
} from '@phosphor-icons/react'
import { formatDistanceToNow, format } from 'date-fns'

const ICON_MAP: Record<string, any> = {
  Sparkle, Trophy, Rocket, Code, MagnifyingGlass, ChatCircle, Lightbulb,
  UserPlus, Envelope, CurrencyInr, CalendarBlank: Calendar,
  Users, Brain, Robot, GitBranch, PaintBrush, LinkSimple, ChartBar, House,
  Megaphone, FileText, Video,
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  gray: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/30' },
}

const NAV_TABS = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'projects', label: 'Projects', icon: Code },
  { id: 'ventures', label: 'Ventures', icon: Rocket },
  { id: 'looking_for', label: 'Looking For', icon: MagnifyingGlass },
  { id: 'communities', label: 'Communities', icon: Users },
  { id: 'people', label: 'People', icon: UserPlus },
  { id: 'events', label: 'Events & Updates', icon: Calendar },
  { id: 'discussions', label: 'Discussions', icon: ChatCircle },
  { id: 'resources', label: 'Resources', icon: Lightbulb },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'about', label: 'About', icon: Info },
]

interface OrganizationPageProps {
  organization: any
  currentUser: any
  membership: any
  permissions: {
    is_member: boolean
    is_admin: boolean
    is_moderator: boolean
    can_edit: boolean
    can_moderate: boolean
    can_invite: boolean
    can_post_resource: boolean
    can_post_discussion: boolean
  }
}

export function OrganizationPage({ organization: initialOrg, currentUser, membership, permissions }: OrganizationPageProps) {
  const supabase = createClient()
  const router = useRouter()

  const [org, setOrg] = useState(initialOrg)
  const [activeTab, setActiveTab] = useState('overview')

  // Data
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [updates, setUpdates] = useState<any[]>([])
  const [updatesTab, setUpdatesTab] = useState<'projects' | 'ventures' | 'looking_for' | 'discussions'>('projects')
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [communities, setCommunities] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [leaders, setLeaders] = useState<any[]>([])

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false)
  const [quickAction, setQuickAction] = useState<string | null>(null)

  const format1 = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  // ============================================
  // Load data
  // ============================================
  const loadAnnouncements = useCallback(async () => {
    const res = await fetch(`/api/organizations/${org.slug}/announcements`)
    const data = await res.json()
    setAnnouncements(data.announcements || [])
  }, [org.slug])

  const loadUpdates = useCallback(async (tab: string) => {
    setUpdatesLoading(true)
    try {
      const res = await fetch(`/api/organizations/${org.slug}/updates?tab=${tab}&limit=4`)
      const data = await res.json()
      setUpdates(data.items || [])
    } finally {
      setUpdatesLoading(false)
    }
  }, [org.slug])

  const loadCommunities = useCallback(async () => {
    const res = await fetch(`/api/organizations/${org.slug}/communities`)
    const data = await res.json()
    setCommunities(data.communities || [])
  }, [org.slug])

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/organizations/${org.slug}/events`)
    const data = await res.json()
    setEvents(data.events || [])
  }, [org.slug])

  const loadActivity = useCallback(async () => {
    const res = await fetch(`/api/organizations/${org.slug}/activity`)
    const data = await res.json()
    setActivity(data.activity || [])
  }, [org.slug])

  const loadLeaders = useCallback(async () => {
    const res = await fetch(`/api/organizations/${org.slug}/leaders`)
    const data = await res.json()
    setLeaders(data.leaders || [])
  }, [org.slug])

  useEffect(() => {
    loadAnnouncements()
    loadUpdates(updatesTab)
    loadCommunities()
    loadEvents()
    loadActivity()
    loadLeaders()

    // Auto-refresh every 3 min
    const interval = setInterval(() => {
      loadAnnouncements()
      loadUpdates(updatesTab)
      loadActivity()
    }, 3 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadUpdates(updatesTab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatesTab])

  // Realtime activity
  useEffect(() => {
    const channel = supabase
      .channel(`org-${org.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'organization_activity',
        filter: `organization_id=eq.${org.id}`,
      }, () => loadActivity())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'organization_announcements',
        filter: `organization_id=eq.${org.id}`,
      }, () => loadAnnouncements())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id])

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied')
  }

  const handleInteract = (entity_type: string, entity_id: string) => {
    fetch(`/api/organizations/${org.slug}/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type, entity_id }),
    }).catch(() => {})
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-4 md:p-6">
        {/* ==================== MAIN COLUMN ==================== */}
        <div className="min-w-0 space-y-4">
          {/* HEADER */}
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="relative">
              {/* Banner */}
              <div
                className="h-40 md:h-48 w-full relative overflow-hidden"
                style={{
                  backgroundImage: org.banner_url
                    ? `url(${org.banner_url})`
                    : 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>

              {/* Content */}
              <div className="px-5 pb-5">
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-14 relative">
                  {/* Logo */}
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white border-4 border-background shadow-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {org.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-12 h-12 text-red-600" weight="fill" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 md:pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight">{org.name}</h1>
                      {org.is_verified && <CheckCircle className="w-5 h-5 text-blue-500" weight="fill" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-muted-foreground font-medium">Official Community</p>
                      <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded font-semibold uppercase tracking-wider">
                        {org.type || 'University'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{org.description}</p>
                  </div>

                  <div className="flex gap-2 md:pb-2">
                    {permissions.can_invite && (
                      <Button size="sm" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" weight="bold" /> Invite Members
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={handleShare}>
                      <ShareNetwork className="w-3.5 h-3.5" weight="bold" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mt-5">
                  <StatCard label="Members" value={format1(org.member_count || 0)} />
                  <StatCard label="Projects" value={format1(org.project_count || 0)} />
                  <StatCard label="Ventures" value={format1(org.venture_count || 0)} />
                  <StatCard label="Looking For" value={format1(org.looking_for_count || 0)} />
                  <StatCard label="Communities" value={format1(org.community_count || 0)} />
                  <StatCard label="Events" value={format1(org.event_count || 0)} />
                </div>

                {/* Single Navigation */}
                <div className="mt-5 border-t pt-3 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-1 min-w-max">
                    {NAV_TABS.map(tab => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap',
                            isActive
                              ? 'bg-primary/10 text-primary border-b-2 border-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" weight={isActive ? 'fill' : 'regular'} />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'overview' && (
            <>
              {/* What's Happening Today */}
              <div className="bg-card border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">What&apos;s Happening Today</h2>
                  <button className="text-xs text-blue-500 hover:underline">View all updates</button>
                </div>
                {announcements.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No announcements yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {announcements.slice(0, 4).map(a => (
                      <AnnouncementCard key={a.id} announcement={a} />
                    ))}
                  </div>
                )}
              </div>

              {/* Top Updates */}
              <div className="bg-card border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">Top Updates From {org.name.split(' ').pop()}</h2>
                  <button className="text-xs text-blue-500 hover:underline">View all</button>
                </div>

                {/* Sub-tabs for updates */}
                <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'projects', label: 'Projects' },
                    { id: 'ventures', label: 'Ventures' },
                    { id: 'looking_for', label: 'Looking For' },
                    { id: 'discussions', label: 'Discussions' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setUpdatesTab(t.id as any)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                        updatesTab === t.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {updatesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse" />)}
                  </div>
                ) : updates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No {updatesTab.replace('_', ' ')} yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {updates.map(item => (
                      <UpdateCard
                        key={item.id}
                        item={item}
                        type={updatesTab}
                        onInteract={handleInteract}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Affiliated Communities */}
              <div className="bg-card border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">Affiliated Communities</h2>
                  <button className="text-xs text-blue-500 hover:underline">View all communities</button>
                </div>
                {communities.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No communities yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {communities.slice(0, 4).map(c => (
                      <CommunityCard key={c.id} community={c} />
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Events */}
              <div className="bg-card border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold">Upcoming Events</h2>
                  <button className="text-xs text-blue-500 hover:underline">View all events</button>
                </div>
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No upcoming events</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {events.slice(0, 4).map(e => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab !== 'overview' && (
            <div className="bg-card border rounded-2xl p-12 text-center">
              <h2 className="text-lg font-bold capitalize">{activeTab.replace('_', ' ')}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This tab is being built. All content will load from live data.
              </p>
            </div>
          )}
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide pb-6">
            <QuickActionsPanel
              orgSlug={org.slug}
              permissions={permissions}
              onOpenInvite={() => setInviteOpen(true)}
            />
            <AboutPanel org={org} canEdit={permissions.can_edit} />
            <RecentActivityPanel activity={activity} />
            <TopLeadersPanel leaders={leaders} />
          </div>
        </aside>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteOpen && (
          <InviteModal
            orgSlug={org.slug}
            orgName={org.name}
            onClose={() => setInviteOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// SUB COMPONENTS
// ============================================

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center py-2 px-2 bg-muted/30 rounded-lg">
      <p className="text-base md:text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    </div>
  )
}

function AnnouncementCard({ announcement }: any) {
  const Icon = ICON_MAP[announcement.icon] || Sparkle
  const colors = COLOR_MAP[announcement.color] || COLOR_MAP.blue
  const startDate = announcement.start_date ? new Date(announcement.start_date) : null

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl border hover:border-primary/30 transition-colors cursor-pointer">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colors.bg)}>
        <Icon className={cn('w-4 h-4', colors.text)} weight="fill" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{announcement.title}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-1">{announcement.content}</p>
        {startDate && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {format(startDate, 'MMM d')}
            {announcement.end_date && ` – ${format(new Date(announcement.end_date), 'MMM d')}`}
          </p>
        )}
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" weight="bold" />
    </div>
  )
}

function UpdateCard({ item, type, onInteract }: any) {
  const router = useRouter()

  const handleClick = () => {
    onInteract(type === 'looking_for' ? 'looking_for' : type.slice(0, -1), item.id)
    if (type === 'projects') router.push(`/projects/${item.slug}`)
    else if (type === 'ventures') router.push(`/ventures/${item.slug}`)
    else if (type === 'looking_for') router.push(`/ventures/${item.ventures?.slug}`)
  }

  const typeLabel = type === 'projects' ? 'Project' : type === 'ventures' ? 'Venture' : type === 'looking_for' ? 'Looking For' : 'Discussion'
  const typeColor = type === 'projects' ? 'purple' : type === 'ventures' ? 'orange' : type === 'looking_for' ? 'green' : 'blue'
  const colors = COLOR_MAP[typeColor]

  const title = item.name || item.title
  const desc = item.tagline || item.description || ''
  const tags = item.category || item.tags || item.tech_stack || []
  const timeAgo = item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: false }) : ''

  return (
    <div
      onClick={handleClick}
      className="bg-card border rounded-xl p-3.5 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider', colors.bg, colors.text)}>
          {typeLabel}
        </span>
        <span className="text-[10px] text-muted-foreground">{timeAgo} ago</span>
      </div>
      <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-2">{title}</h3>
      {desc && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 flex-1">{desc}</p>}
      {Array.isArray(tags) && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 3).map((t: string, i: number) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-medium">{t}</span>
          ))}
          {tags.length > 3 && <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-medium">+{tags.length - 3}</span>}
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t mt-auto">
        {item.users && (
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5">
              <AvatarImage src={item.users.avatar_url} />
              <AvatarFallback className="text-[8px]">{item.users.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground truncate">{item.users.full_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {item.like_count > 0 && <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {item.like_count}</span>}
          {item.comment_count > 0 && <span className="flex items-center gap-0.5"><ChatCircle className="w-3 h-3" /> {item.comment_count}</span>}
        </div>
      </div>
    </div>
  )
}

function CommunityCard({ community }: any) {
  const Icon = ICON_MAP[community.icon] || Users
  const colors = COLOR_MAP[community.icon_color] || COLOR_MAP.blue

  return (
    <Link href={`/community/${community.slug}`} className="bg-card border rounded-xl p-3.5 hover:border-primary/40 transition-all group block">
      <div className="flex items-start gap-3 mb-2">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.text)} weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{community.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {community.member_count?.toLocaleString() || 0} members
          </p>
        </div>
      </div>
      <div className={cn(
        'text-[10px] font-semibold text-center py-1.5 rounded',
        community.is_joined ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
      )}>
        {community.is_joined ? 'Joined' : 'Join'}
      </div>
    </Link>
  )
}

function EventCard({ event }: any) {
  const start = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : null

  return (
    <div className="bg-card border rounded-xl overflow-hidden hover:border-primary/40 transition-all cursor-pointer group">
      <div className="h-16 bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center relative">
        <div className="text-center">
          <p className="text-[9px] font-bold text-pink-400 uppercase">{format(start, 'MMM')}</p>
          <p className="text-xl font-bold text-pink-400 leading-none">{format(start, 'd')}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold line-clamp-1 mb-0.5">{event.title}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{event.event_type || 'Event'}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {format(start, 'MMM d, yyyy')}
          {end && ` – ${format(end, 'MMM d')}`}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {event.is_online ? 'Online' : (event.location || 'TBD')}
        </p>
        <Button size="sm" className="w-full mt-2 h-7 text-[11px]">Register</Button>
      </div>
    </div>
  )
}

// ============================================
// RIGHT SIDEBAR
// ============================================

function QuickActionsPanel({ orgSlug, permissions, onOpenInvite }: any) {
  const router = useRouter()
  const actions = [
    { id: 'project', label: 'Create Project', icon: Code, color: 'blue', href: `/projects/new?org=${orgSlug}` },
    { id: 'venture', label: 'Post Venture', icon: Rocket, color: 'orange', href: `/ventures/new?org=${orgSlug}` },
    { id: 'looking_for', label: 'Post Looking For', icon: MagnifyingGlass, color: 'green', href: `/looking-for/new?org=${orgSlug}` },
    { id: 'discussion', label: 'Start Discussion', icon: ChatCircle, color: 'purple', href: `/organizations/${orgSlug}?tab=discussions&new=1` },
    { id: 'resource', label: 'Share Resource', icon: Lightbulb, color: 'yellow', href: `/organizations/${orgSlug}?tab=resources&new=1` },
    { id: 'invite', label: 'Invite Member', icon: UserPlus, color: 'pink', onClick: onOpenInvite },
  ]

  return (
    <div className="bg-card border rounded-2xl p-4">
      <p className="text-sm font-bold mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(a => {
          const Icon = a.icon
          const colors = COLOR_MAP[a.color]
          const handle = () => {
            if (a.onClick) a.onClick()
            else if (a.href) router.push(a.href)
          }
          return (
            <button
              key={a.id}
              onClick={handle}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border hover:border-primary/40 hover:bg-muted/30 transition-all"
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
                <Icon className={cn('w-4 h-4', colors.text)} weight="fill" />
              </div>
              <p className="text-[10px] font-semibold text-center leading-tight">{a.label}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AboutPanel({ org, canEdit }: any) {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold">About {org.name.split(' ').pop()}</p>
        {canEdit && (
          <button className="text-xs text-blue-500 hover:underline">Edit</button>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{org.description}</p>
      <div className="space-y-2 text-xs">
        {org.founded_year && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Founded</span>
            <span className="font-semibold">{org.founded_year}</span>
          </div>
        )}
        {org.location && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="font-semibold truncate ml-2">{org.location}</span>
          </div>
        )}
        {org.type && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-semibold capitalize">{org.type}</span>
          </div>
        )}
        {org.website && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Website</span>
            <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate ml-2">
              {org.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs">
        View Organization Profile
      </Button>
    </div>
  )
}

function RecentActivityPanel({ activity }: any) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-3.5 border-b flex items-center justify-between">
        <p className="text-sm font-bold">Recent Activity</p>
        <button className="text-xs text-blue-500 hover:underline">View all</button>
      </div>
      {activity.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
      ) : (
        <div className="divide-y">
          {activity.slice(0, 6).map((a: any) => (
            <div key={a.id} className="p-3 flex items-start gap-2.5 hover:bg-muted/30 transition-colors">
              {a.users?.avatar_url ? (
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage src={a.users.avatar_url} />
                  <AvatarFallback className="text-[9px]">{a.users?.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Sparkle className="w-3.5 h-3.5 text-muted-foreground" weight="fill" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-tight">
                  {a.users?.full_name && <span className="font-semibold">{a.users.full_name} </span>}
                  <span className="text-muted-foreground">{a.title}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: false })} ago
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TopLeadersPanel({ leaders }: any) {
  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-3.5 border-b flex items-center justify-between">
        <p className="text-sm font-bold">Top Leaders</p>
        <Link href="/leaderboard" className="text-xs text-blue-500 hover:underline">View leaderboard</Link>
      </div>
      {leaders.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No leaders yet</p>
      ) : (
        <div className="divide-y">
          {leaders.slice(0, 3).map((l: any, i: number) => (
            <Link
              key={l.id}
              href={`/profile/${l.username}`}
              className="flex items-center gap-2.5 p-3 hover:bg-muted/30 transition-colors"
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                i === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                i === 1 ? 'bg-gray-400/20 text-gray-400' :
                'bg-orange-600/20 text-orange-600'
              )}>
                {i + 1}
              </div>
              <Avatar className="w-9 h-9">
                <AvatarImage src={l.avatar_url} />
                <AvatarFallback className="text-xs">{l.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{l.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{l.community_name}</p>
              </div>
              <span className="text-xs font-bold tabular-nums flex-shrink-0">{l.points.toLocaleString()} pts</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// INVITE MODAL
// ============================================

function InviteModal({ orgSlug, orgName, onClose }: any) {
  const [emails, setEmails] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const emailList = emails.split(/[,\s\n]+/).map(e => e.trim()).filter(e => e.includes('@'))
    if (emailList.length === 0) {
      toast.error('Add at least one valid email')
      return
    }
    setSending(true)
    const res = await fetch(`/api/organizations/${orgSlug}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emailList, message }),
    })
    setSending(false)
    if (res.ok) {
      const data = await res.json()
      toast.success(`${data.count} invitations sent`)
      onClose()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to send')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border rounded-2xl w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Invite Members to {orgName}</h2>
          <button onClick={onClose}><X className="w-5 h-5" weight="bold" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email Addresses</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="alice@iitd.ac.in, bob@iitd.ac.in..."
              rows={3}
              className="w-full text-sm bg-muted/40 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Separate multiple emails with commas or new lines</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Personal Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Join our IIT Delhi community on DSRT Connect..."
              rows={2}
              className="w-full text-sm bg-muted/40 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !emails.trim()} className="flex-1">
              {sending ? 'Sending...' : 'Send Invitations'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}