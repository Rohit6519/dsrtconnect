'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { STAGES } from '@/lib/config/sectors'
import { createClient } from '@/lib/supabase/client'
import {
  CaretLeft,
  CheckCircle,
  UserPlus,
  UserCheck,
  ChatCircle,
  ShareNetwork,
  DotsThree,
  MapPin,
  Users,
  Handshake,
  ShieldCheck,
  PencilSimple,
  Camera,
  ChartLineUp,
  TrendUp,
  TrendDown,
  ArrowRight,
  MagnifyingGlassPlus as ZoomIn,
  MagnifyingGlassMinus as ZoomOut,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VentureOverview } from './VentureOverview'
import { VentureSidebar } from './VentureSidebar'
import { VentureUpdates } from './VentureUpdates'
import { VentureNotifications } from './VentureNotifications'
import { ConnectionModal } from './modals/ConnectionModal'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import Cropper from 'react-easy-crop'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

// ============================================
// TYPES
// ============================================
interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface CropPosition {
  x: number
  y: number
}

interface Venture {
  id: string
  slug: string
  name: string
  tagline?: string | null
  logo_url?: string | null
  headquarters?: string | null
  website?: string | null
  stage?: string | null
  industry?: string | null
  sub_category?: string | null
  start_date?: string | null
  is_verified?: boolean
  is_building_public?: boolean
  follower_count?: number | null
  updated_at?: string
}

interface TeamMember {
  id: string
  user_id?: string
  role?: string
  full_name?: string
  avatar_url?: string
}

interface Metric {
  id: string
  name: string
  type?: string
  unit?: string
  color?: string
}

interface MetricEntry {
  id: string
  metric_id: string
  value: number
  date: string
  venture_metrics?: {
    name: string
    type?: string
    unit?: string
    color?: string
  }
}

interface Update {
  id: string
  title?: string
  content: string
  created_at: string
}

interface LookingForItem {
  id: string
  title?: string
  description?: string
  category?: string
}

interface DocumentItem {
  id: string
  name?: string
  url?: string
}

interface CurrentUser {
  id: string
  full_name?: string
  username?: string
  avatar_url?: string | null
}

interface VentureDetailViewProps {
  venture: Venture
  isOwner: boolean
  currentUser: CurrentUser | null
  teamMembers: TeamMember[]
  metrics: Metric[]
  updates: Update[]
  lookingFor: LookingForItem[]
  documents: DocumentItem[]
}

// ============================================
// CROP UTILITY (typed)
// ============================================
async function getCroppedImg(imageSrc: string, pixelCrop: CropArea, rotation: number = 0): Promise<Blob> {
  const image = new window.Image()
  image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas 2D context')

  canvas.width = 400
  canvas.height = 400
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, 400, 400)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas produced empty blob'))
      },
      'image/jpeg',
      0.92
    )
  })
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'projects', label: 'Projects' },
  { id: 'team', label: 'Team' },
  { id: 'problem', label: 'Problem & Solution' },
  { id: 'product', label: 'Product' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'looking-for', label: 'Looking For' },
  { id: 'updates', label: 'Updates' },
  { id: 'documents', label: 'Documents' },
]

// ============================================
// MAIN COMPONENT
// ============================================
export function VentureDetailView({
  venture: initialVenture,
  isOwner,
  currentUser,
  teamMembers: initialTeamMembers,
  metrics: initialMetrics,
  updates: initialUpdates,
  lookingFor: initialLookingFor,
  documents: initialDocuments,
}: VentureDetailViewProps) {
  const router = useRouter()
  const supabase = createClient()

  const [venture, setVenture] = useState<Venture>(initialVenture)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics)
  const [updates, setUpdates] = useState<Update[]>(initialUpdates)
  const [lookingFor, setLookingFor] = useState<LookingForItem[]>(initialLookingFor)
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [activeTab, setActiveTab] = useState('overview')

  // Modals
  const [connectionModalOpen, setConnectionModalOpen] = useState(false)
  const [editHeaderOpen, setEditHeaderOpen] = useState(false)
  const [logoModalOpen, setLogoModalOpen] = useState(false)

  // Follow
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState<number>(venture.follower_count || 0)

  // Growth chart data
  const [metricEntries, setMetricEntries] = useState<MetricEntry[]>([])

  const stage = STAGES.find(s => s.id === venture.stage) || STAGES[0]
  const displayedTabs = isOwner ? [...tabs, { id: 'notifications', label: 'Notifications' }] : tabs

  // Check follow status
  useEffect(() => {
    if (isOwner || !currentUser) return

    const checkFollow = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_type', 'venture')
        .eq('following_id', venture.id)
        .maybeSingle()

      setIsFollowing(!!data)
    }
    checkFollow()
  }, [venture.id, currentUser?.id, isOwner, supabase, currentUser])

  // Real-time follower count
  useEffect(() => {
    const channel = supabase
      .channel(`venture-follows-${venture.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${venture.id}`,
        },
        async () => {
          const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_type', 'venture')
            .eq('following_id', venture.id)

          if (count !== null) setFollowerCount(count)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venture.id, supabase])

  // Load metric entries for growth chart
  useEffect(() => {
    const load = async () => {
      if (metrics.length === 0) return
      const { data } = await supabase
        .from('venture_metric_entries')
        .select('*, venture_metrics(name, type, unit, color)')
        .in('metric_id', metrics.map((m) => m.id))
        .order('date', { ascending: true })
      setMetricEntries((data as MetricEntry[]) || [])
    }
    load()
  }, [metrics, supabase])

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Please log in to follow')
      return
    }

    setFollowLoading(true)

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_type', 'venture')
        .eq('following_id', venture.id)

      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_type: 'venture',
        following_id: venture.id,
      })

      setIsFollowing(true)
      toast.success(`Following ${venture.name}`)
    }

    setFollowLoading(false)
  }

  const handleMessage = () => {
    toast.info('Message sent to venture team')
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/ventures/${venture.slug}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  // Growth chart data
  const chartData = prepareChartData(metricEntries)
  const growthScore = calculateGrowthScore(metricEntries)

  return (
    <div className="min-h-screen bg-background">
      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <Link
          href="/ventures"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <CaretLeft className="w-4 h-4" weight="bold" />
          Back to Ventures
        </Link>
      </div>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 mb-8">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Logo - Editable */}
            <div className="flex-shrink-0 relative group">
              {venture.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={venture.logo_url}
                  alt={venture.name}
                  className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover shadow-xl"
                />
              ) : (
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-4xl shadow-xl">
                  {venture.name[0]?.toUpperCase()}
                </div>
              )}
              {isOwner && (
                <button
                  onClick={() => setLogoModalOpen(true)}
                  className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                >
                  <Camera className="w-4 h-4" weight="bold" />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Stage */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    'inline-flex items-center text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider',
                    stage.color
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Name + Verified + Edit */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{venture.name}</h1>
                {venture.is_verified ? (
                  <CheckCircle className="w-6 h-6 text-blue-500" weight="fill" />
                ) : (
                  isOwner && (
                    <button
                      onClick={() => toast.info('Verification coming soon')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-md text-xs font-bold hover:bg-blue-500/20"
                    >
                      <ShieldCheck className="w-3 h-3" weight="fill" />
                      Get Verified
                    </button>
                  )
                )}
                {isOwner && (
                  <button
                    onClick={() => setEditHeaderOpen(true)}
                    className="p-1.5 hover:bg-muted rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <PencilSimple className="w-4 h-4" weight="duotone" />
                  </button>
                )}
              </div>

              {/* Tagline */}
              {venture.tagline && <p className="text-sm text-muted-foreground mt-1">{venture.tagline}</p>}

              {/* Tags */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {venture.industry && (
                  <span className="text-xs px-2.5 py-1 bg-muted rounded-md font-medium">{venture.industry}</span>
                )}
                {venture.sub_category && (
                  <span className="text-xs px-2.5 py-1 bg-muted rounded-md font-medium">{venture.sub_category}</span>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                {venture.start_date && (
                  <span>
                    Founded{' '}
                    {new Date(venture.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {venture.headquarters && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" weight="duotone" />
                    {venture.headquarters}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" weight="duotone" />
                  {teamMembers.length} {teamMembers.length === 1 ? 'Member' : 'Members'}
                </span>
                {followerCount > 0 && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" weight="duotone" />
                    {followerCount} Followers
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-5 flex-wrap">
                {!isOwner ? (
                  <>
                    <Button
                      onClick={handleFollow}
                      disabled={followLoading}
                      variant={isFollowing ? 'outline' : 'default'}
                      size="sm"
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 mr-1" weight="bold" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 mr-1" weight="bold" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleMessage}>
                      <ChatCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConnectionModalOpen(true)}>
                      <Handshake className="w-3.5 h-3.5 mr-1" weight="bold" />
                      Connect
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <ShareNetwork className="w-3.5 h-3.5 mr-1" weight="bold" />
                      Share
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground italic">
                      This is your venture. Click any section below to add details.
                    </span>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <ShareNetwork className="w-3.5 h-3.5 mr-1" weight="bold" />
                      Share
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm">
                  <DotsThree className="w-5 h-5" weight="bold" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Health */}
          <VentureSidebar
            venture={venture}
            metrics={metrics}
            lookingFor={lookingFor}
            updates={updates}
            teamMembers={teamMembers}
            isOwner={isOwner}
            onUpdate={setVenture}
            onLookingForUpdate={setLookingFor}
          />
        </div>

        {/* Tabs */}
        <div className="border-b overflow-x-auto sticky top-14 bg-background z-30">
          <div className="flex gap-1 min-w-max">
            {displayedTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <VentureOverview
              venture={venture}
              teamMembers={teamMembers}
              metrics={metrics}
              documents={documents}
              isOwner={isOwner}
              onUpdate={setVenture}
              onTeamUpdate={setTeamMembers}
              onMetricsUpdate={setMetrics}
              onDocumentsUpdate={setDocuments}
            />
          )}
          {activeTab === 'updates' && (
            <VentureUpdates venture={venture} initialUpdates={updates} isOwner={isOwner} />
          )}
          {activeTab === 'notifications' && isOwner && <VentureNotifications ventureId={venture.id} />}
          {!['overview', 'updates', 'notifications'].includes(activeTab) && (
            <div className="bg-card border rounded-2xl p-12 text-center">
              <h3 className="font-bold text-lg mb-2 capitalize">{activeTab.replace('-', ' ')}</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          )}
        </div>

        {/* GROWTH OVERVIEW */}
        {metrics.length > 0 && metricEntries.length > 0 && (
          <div className="mt-8 bg-card border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ChartLineUp className="w-5 h-5 text-blue-500" weight="fill" />
                </div>
                <div>
                  <h3 className="font-bold">Growth Overview</h3>
                  <p className="text-xs text-muted-foreground">Composite of all metrics · AI-weighted</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {['Week', 'Month', 'Quarter', 'Year'].map((t) => (
                  <button
                    key={t}
                    className="text-xs px-2.5 py-1 rounded font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Growth Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold tabular-nums">{growthScore.current.toFixed(0)}</span>
                  <span
                    className={cn(
                      'text-sm font-semibold flex items-center gap-0.5',
                      growthScore.change >= 0 ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {growthScore.change >= 0 ? (
                      <TrendUp className="w-3.5 h-3.5" weight="bold" />
                    ) : (
                      <TrendDown className="w-3.5 h-3.5" weight="bold" />
                    )}
                    {Math.abs(growthScore.change).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Link
                href={`/ventures/${venture.slug}/analytics`}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                View Full Analytics <ArrowRight className="w-3 h-3" weight="bold" />
              </Link>
            </div>

            {/* Chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    fill="url(#growthGradient)"
                    dot={{ fill: 'hsl(217, 91%, 60%)', r: 3, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Metric contributions */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                Metric Contributions
              </p>
              <div className="space-y-1.5">
                {metrics.slice(0, 5).map((m) => {
                  const mEntries = metricEntries.filter((e) => e.metric_id === m.id)
                  const latest = mEntries[mEntries.length - 1]
                  const previous = mEntries[mEntries.length - 2]
                  const change =
                    latest && previous && previous.value !== 0
                      ? ((latest.value - previous.value) / previous.value) * 100
                      : 0
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full bg-${m.color || 'blue'}-500`} />
                      <span className="flex-1 truncate">{m.name}</span>
                      {latest && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold',
                            change >= 0 ? 'text-green-500' : 'text-red-500'
                          )}
                        >
                          {change >= 0 ? '+' : ''}
                          {change.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {venture.is_building_public && (
        <div className="border-t bg-gradient-to-br from-blue-500/5 to-purple-500/5 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <p className="text-sm font-semibold">🌱 This venture is building in public with DSRT Connect</p>
            <p className="text-xs text-muted-foreground mt-1">
              All updates, metrics, and progress are transparently shared with the community.
            </p>
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {connectionModalOpen && (
        <ConnectionModal
          open={connectionModalOpen}
          onOpenChange={setConnectionModalOpen}
          venture={venture}
          onSent={() => {}}
        />
      )}

      {/* Edit Header Modal */}
      {editHeaderOpen && (
        <EditHeaderModal
          open={editHeaderOpen}
          onOpenChange={setEditHeaderOpen}
          venture={venture}
          onSaved={(updated: Venture) => {
            setVenture(updated)
            setEditHeaderOpen(false)
          }}
        />
      )}

      {/* Logo Upload Modal */}
      {logoModalOpen && (
        <LogoUploadModal
          open={logoModalOpen}
          onOpenChange={setLogoModalOpen}
          venture={venture}
          onSaved={(updated: Venture) => {
            setVenture(updated)
            setLogoModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// EDIT HEADER MODAL
// ============================================
interface EditHeaderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture: Venture
  onSaved: (updated: Venture) => void
}

function EditHeaderModal({ open, onOpenChange, venture, onSaved }: EditHeaderModalProps) {
  const supabase = createClient()
  const [name, setName] = useState(venture.name || '')
  const [tagline, setTagline] = useState(venture.tagline || '')
  const [headquarters, setHeadquarters] = useState(venture.headquarters || '')
  const [website, setWebsite] = useState(venture.website || '')
  const [stage, setStage] = useState(venture.stage || 'idea')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('ventures')
      .update({
        name: name.trim(),
        tagline: tagline.trim() || null,
        headquarters: headquarters.trim() || null,
        website: website.trim() || null,
        stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venture.id)
      .select()
      .single()
    setSaving(false)
    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Updated')
      onSaved(data as Venture)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Venture Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Headquarters</Label>
            <Input
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="City, Country"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <div className="grid grid-cols-4 gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStage(s.id)}
                  className={cn(
                    'p-2 border rounded-lg text-xs font-semibold transition-all',
                    stage === s.id ? s.color : 'hover:bg-muted'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// LOGO UPLOAD MODAL WITH CROP
// ============================================
interface LogoUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture: Venture
  onSaved: (updated: Venture) => void
}

function LogoUploadModal({ open, onOpenChange, venture, onSaved }: LogoUploadModalProps) {
  const supabase = createClient()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropPosition>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
  const [uploading, setUploading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (files: File[]) => {
      const file = files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setImageSrc(reader.result)
          }
        }
        reader.readAsDataURL(file)
      }
    },
  })

  const onCropComplete = useCallback((_croppedArea: CropArea, croppedAreaPixelsValue: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixelsValue)
  }, [])

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setUploading(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const path = `${venture.id}/logo-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('ventures')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('ventures').getPublicUrl(path)

      const { data, error } = await supabase
        .from('ventures')
        .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', venture.id)
        .select()
        .single()

      if (error) throw error
      toast.success('Logo updated')
      onSaved(data as Venture)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Failed: ' + message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Update Logo</DialogTitle>
        </DialogHeader>
        {!imageSrc ? (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
              isDragActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
            )}
          >
            <input {...getInputProps()} />
            <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-2" weight="duotone" />
            <p className="font-medium">Drop image or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Max 5MB · JPG, PNG, WEBP</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative w-full bg-black rounded-xl overflow-hidden" style={{ height: '350px' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground" weight="duotone" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" weight="duotone" />
              <span className="text-xs font-mono w-10 text-right">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImageSrc(null)} className="flex-1">
                Change Image
              </Button>
              <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                {uploading ? 'Uploading...' : 'Save Logo'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================
interface ChartPoint {
  label: string
  value: number
}

interface GroupedData {
  [key: string]: { total: number; count: number }
}

function prepareChartData(entries: MetricEntry[]): ChartPoint[] {
  if (entries.length === 0) return []
  const grouped: GroupedData = {}
  entries.forEach((entry) => {
    const date = new Date(entry.date)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 }
    grouped[key].total += entry.value
    grouped[key].count += 1
  })
  return Object.keys(grouped)
    .sort()
    .slice(-8)
    .map((key) => {
      const [year, month] = key.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: Math.round(grouped[key].total / grouped[key].count),
      }
    })
}

interface GrowthScore {
  current: number
  previous: number
  change: number
}

function calculateGrowthScore(entries: MetricEntry[]): GrowthScore {
  const chart = prepareChartData(entries)
  const current = chart[chart.length - 1]?.value || 0
  const previous = chart[chart.length - 2]?.value || 0
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
  return { current, previous, change }
}