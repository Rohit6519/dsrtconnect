'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  ExternalLink,
  Users,
  Target,
  Briefcase,
  FileText,
  Rocket,
  CheckCircle2,
  Circle,
  Eye,
  User,
  Video,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { PitchVideoUpload } from './PitchVideoUpload'
import { VentureAnalytics } from './VentureAnalytics'
import { IntroRequestButton } from './IntroRequestButton'

interface VentureViewProps {
  venture: any
  members: any[]
  milestones: any[]
  openRoles: any[]
  founderProfile: any
  isMember: boolean
  isFounder: boolean
  currentUserId?: string
}

export function VentureView({
  venture,
  members,
  milestones,
  openRoles,
  founderProfile,
  isMember,
  isFounder,
  currentUserId,
}: VentureViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<
    | 'overview'
    | 'founder'
    | 'team'
    | 'milestones'
    | 'roles'
    | 'pitch'
    | 'analytics'
  >('overview')
  const [uploadVideo, setUploadVideo] = useState(false)
  const [following, setFollowing] = useState(false)

  const handleFollow = async () => {
    if (!currentUserId) return
    if (following) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_type', 'startup')
        .eq('following_id', venture.id)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_type: 'startup',
        following_id: venture.id,
      })
    }
    setFollowing(!following)
    router.refresh()
  }

  const stageColors: Record<string, string> = {
    idea: 'bg-blue-500/10 text-blue-500',
    building: 'bg-amber-500/10 text-amber-500',
    mvp: 'bg-purple-500/10 text-purple-500',
    launched: 'bg-emerald-500/10 text-emerald-500',
    growing: 'bg-cyan-500/10 text-cyan-500',
    funded: 'bg-rose-500/10 text-rose-500',
  }

  const parseDescription = (desc: string | null) => {
    if (!desc) return { vision: null, about: null }
    const visionMatch = desc.match(/## Vision\n([\s\S]*?)(?=\n## |$)/)
    const aboutMatch = desc.match(/## About\n([\s\S]*?)$/)
    return {
      vision: visionMatch ? visionMatch[1].trim() : null,
      about: aboutMatch ? aboutMatch[1].trim() : desc,
    }
  }

  const { vision, about } = parseDescription(venture.description)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'founder', label: 'Founder', icon: User },
    { id: 'pitch', label: 'Pitch', icon: Video },
    { id: 'team', label: `Team (${members.length})`, icon: Users },
    {
      id: 'milestones',
      label: `Milestones (${milestones.length})`,
      icon: Target,
    },
    {
      id: 'roles',
      label: `Open Roles (${openRoles.length})`,
      icon: Briefcase,
    },
    ...(isFounder
      ? [{ id: 'analytics', label: 'Analytics', icon: TrendingUp }]
      : []),
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        {venture.cover_url && (
          <div className="h-32 md:h-48 bg-muted overflow-hidden">
            <img
              src={venture.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                {venture.logo_url ? (
                  <img
                    src={venture.logo_url}
                    alt={venture.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-muted"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Rocket className="w-7 h-7 text-primary-foreground" />
                  </div>
                )}
                {venture.is_verified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-background flex items-center justify-center">
                    <CheckCircle2 className="w-full h-full text-primary fill-primary/10" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                      stageColors[venture.stage] || 'bg-muted'
                    }`}
                  >
                    {venture.stage}
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  {venture.name}
                  {venture.is_verified && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </h1>
                {venture.tagline && (
                  <p className="text-muted-foreground mt-1">
                    {venture.tagline}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                  <Link
                    href={`/profile/${venture.users?.username}`}
                    className="flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={venture.users?.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {venture.users?.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    Founded by {venture.users?.full_name}
                  </Link>
                  {venture.founded_date && (
                    <>
                      <span>•</span>
                      <span>
                        {format(new Date(venture.founded_date), 'MMM yyyy')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {!isMember && !isFounder && (
                <>
                  <Button onClick={handleFollow} variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    {following ? 'Following' : 'Follow Journey'}
                  </Button>
                  <IntroRequestButton
                    founderId={venture.founder_id}
                    ventureId={venture.id}
                    ventureName={venture.name}
                  />
                </>
              )}
              {isFounder && <Button variant="outline">Edit</Button>}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-3 border-t border-border/40 text-sm">
            <div>
              <span className="font-semibold">{venture.member_count || 1}</span>
              <span className="text-muted-foreground ml-1">members</span>
            </div>
            <div>
              <span className="font-semibold">
                {venture.follower_count || 0}
              </span>
              <span className="text-muted-foreground ml-1">followers</span>
            </div>
            <div>
              <span className="font-semibold">{milestones.length}</span>
              <span className="text-muted-foreground ml-1">milestones</span>
            </div>
          </div>

          {venture.category && venture.category.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {venture.category.map((c: string) => (
                <span
                  key={c}
                  className="px-2.5 py-1 text-xs bg-muted/50 rounded-md"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {venture.website && (
            <a
              href={venture.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border/40 hover:bg-muted/40 w-fit"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {venture.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {vision && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Vision</h2>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap text-foreground/90">
                {vision}
              </p>
            </div>
          )}

          {about && (
            <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
              <h2 className="font-semibold mb-3">About</h2>
              <p className="leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {about}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'founder' && (
        <FounderProfileView
          profile={founderProfile}
          founder={venture.users}
          isFounder={isFounder}
          ventureSlug={venture.slug}
        />
      )}

      {tab === 'pitch' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Pitch Video</h2>
            {isFounder && venture.pitch_video_url && !uploadVideo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadVideo(true)}
              >
                Replace
              </Button>
            )}
          </div>

          {uploadVideo || (isFounder && !venture.pitch_video_url) ? (
            <PitchVideoUpload
              ventureId={venture.id}
              currentUrl={venture.pitch_video_url}
              onDone={() => setUploadVideo(false)}
            />
          ) : venture.pitch_video_url ? (
            <video
              src={venture.pitch_video_url}
              controls
              className="w-full rounded-xl bg-black"
            />
          ) : (
            <div className="text-center py-12">
              <Video className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No pitch video yet.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-3">
          <h2 className="font-semibold">Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/profile/${m.users?.username}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/40 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={m.users?.avatar_url} />
                  <AvatarFallback>
                    {m.users?.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{m.users?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.title || m.role}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tab === 'milestones' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No milestones set yet.
            </p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border/40"
                >
                  {m.status === 'achieved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{m.title}</p>
                    {m.achieved_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.status === 'achieved' ? 'Achieved' : 'Target'}:{' '}
                        {format(new Date(m.achieved_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
          {openRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No open roles at the moment.
            </p>
          ) : (
            <div className="space-y-3">
              {openRoles.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-border/40 space-y-2"
                >
                  <p className="font-semibold">{r.title}</p>
                  {r.description && (
                    <p className="text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && isFounder && (
        <VentureAnalytics ventureId={venture.id} />
      )}
    </div>
  )
}

function FounderProfileView({
  profile,
  founder,
  isFounder,
  ventureSlug,
}: any) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center space-y-3">
        <User className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h3 className="font-semibold">No founder profile yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {isFounder
            ? 'Share your story, vision, and unique insight.'
            : 'The founder has not filled out their profile yet.'}
        </p>
        {isFounder && (
          <Link
            href={`/ventures/${ventureSlug}/founder`}
            className="inline-block mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Fill founder profile
          </Link>
        )}
      </div>
    )
  }

  const questions = [
    { id: 'background', label: 'Background' },
    { id: 'why_this_idea', label: 'Why this idea' },
    { id: 'why_now', label: 'Why now' },
    { id: 'unique_insight', label: 'Unique insight' },
    { id: 'prior_experience', label: 'Prior experience' },
    { id: 'biggest_challenge', label: 'Biggest challenge ahead' },
    { id: 'vision_5_years', label: 'Vision in 5 years' },
    { id: 'how_make_money', label: 'How it will make money' },
    { id: 'competition', label: 'Competition' },
    { id: 'unfair_advantage', label: 'Unfair advantage' },
  ]

  const filled = questions.filter((q) => profile[q.id]?.trim())

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={founder?.avatar_url} />
            <AvatarFallback className="text-lg">
              {founder?.full_name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Link
              href={`/profile/${founder?.username}`}
              className="text-lg font-semibold hover:underline"
            >
              {founder?.full_name}
            </Link>
            <p className="text-sm text-muted-foreground">Founder</p>
            {founder?.tagline && (
              <p className="text-sm mt-1">{founder.tagline}</p>
            )}
          </div>
          {isFounder && (
            <Link
              href={`/ventures/${ventureSlug}/founder`}
              className="ml-auto px-3 py-1.5 text-xs rounded-lg border border-border/40 hover:bg-muted/40"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {filled.map((q) => (
        <div
          key={q.id}
          className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6"
        >
          <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
            {q.label}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {profile[q.id]}
          </p>
        </div>
      ))}
    </div>
  )
}