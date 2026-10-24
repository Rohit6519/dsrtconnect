'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  FlaskConical,
  Zap,
  Eye,
  Trophy,
  Layers,
  Calendar,
  MapPin,
  Award,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const CHANNELS = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'research', label: 'Research', icon: FlaskConical, color: '#8b5cf6' },
  { id: 'builders', label: 'Builder Updates', icon: Zap, color: '#f59e0b' },
  { id: 'intel', label: 'DSRT Intel', icon: Eye, color: '#10b981' },
  { id: 'hackathons', label: 'Hackathons', icon: Trophy, color: '#f43f5e' },
]

interface PulseTabsProps {
  currentChannel: string
  posts: any[]
  intelFeatures: any[]
  hackathons: any[]
}

export function PulseTabs({
  currentChannel,
  posts,
  intelFeatures,
  hackathons,
}: PulseTabsProps) {
  const router = useRouter()

  const setChannel = (id: string) => {
    if (id === 'all') {
      router.push('/pulse')
    } else {
      router.push(`/pulse?channel=${id}`)
    }
  }

  return (
    <>
      {/* Channel Tabs */}
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {CHANNELS.map((c) => {
            const Icon = c.icon
            const isActive = currentChannel === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannel(c.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={isActive ? undefined : { color: c.color }}
                />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content based on channel */}
      {currentChannel === 'intel' && (
        <IntelSection features={intelFeatures} />
      )}

      {currentChannel === 'hackathons' && (
        <HackathonsSection hackathons={hackathons} />
      )}

      {currentChannel !== 'intel' && currentChannel !== 'hackathons' && (
        <PostsSection posts={posts} />
      )}
    </>
  )
}

function PostsSection({ posts }: { posts: any[] }) {
  const CATEGORY_ICONS: Record<string, string> = {
    'dsrt-research': '🔬',
    'dsrt-builders': '⚡',
    default: '📰',
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Loading updates...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const slug = post.editorial_categories?.slug || 'default'
        const icon = CATEGORY_ICONS[slug] || CATEGORY_ICONS.default

        return (
          <Link
            key={post.id}
            href={`/pulse/${post.id}`}
            className="block rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 hover:border-border transition-all group"
          >
            <div className="flex gap-4">
              <div className="text-4xl opacity-50 flex-shrink-0 hidden sm:block">
                {icon}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${post.editorial_categories?.color}20`,
                      color: post.editorial_categories?.color,
                    }}
                  >
                    {post.editorial_categories?.icon}{' '}
                    {post.editorial_categories?.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(post.published_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <h2 className="font-bold text-lg leading-tight group-hover:text-foreground">
                  {post.headline}
                </h2>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.summary}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span>👁 {post.view_count || 0}</span>
                  <span>❤ {post.like_count || 0}</span>
                  <span>💬 {post.comment_count || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function IntelSection({ features }: { features: any[] }) {
  if (features.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">DSRT Intel</h3>
          <p className="text-sm text-emerald-400 uppercase tracking-widest mt-1 font-semibold">
            The Rarest Recognition
          </p>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          DSRT Intel features exceptional builders, breakthrough projects, and
          world-changing ventures — hand-picked by the DSRT editorial team.
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-md mx-auto italic">
          No bots. No random posts. Only the best of the best.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <article
          key={feature.id}
          className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card/40 to-card/40 backdrop-blur-sm overflow-hidden hover:border-emerald-500/50 transition-all"
        >
          {/* Premium badge */}
          <div className="px-5 pt-5 pb-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Award className="w-3 h-3 text-white" />
              <span className="text-[10px] uppercase tracking-widest text-white font-bold">
                DSRT Intel
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Featured{' '}
              {formatDistanceToNow(new Date(feature.featured_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          {feature.cover_url && (
            <div className="aspect-[2/1] bg-muted overflow-hidden">
              <img
                src={feature.cover_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5 space-y-3">
            <div>
              <h2 className="font-bold text-xl leading-tight">
                {feature.title}
              </h2>
              {feature.subtitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {feature.subtitle}
                </p>
              )}
            </div>

            {feature.users && (
              <Link
                href={`/profile/${feature.users.username}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/40 transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={feature.users.avatar_url} />
                  <AvatarFallback>
                    {feature.users.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {feature.users.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {feature.users.tagline}
                  </p>
                </div>
              </Link>
            )}

            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.content}
            </p>

            {feature.editor_notes && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-1">
                  Editor's Notes
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {feature.editor_notes}
                </p>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function HackathonsSection({ hackathons }: { hackathons: any[] }) {
  if (hackathons.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">DSRT Hackathons</h3>
          <p className="text-sm text-rose-400 uppercase tracking-widest mt-1 font-semibold">
            Real Events · Real Prizes
          </p>
        </div>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Verified hackathons organized by DSRT and community leaders.
          Registration, timelines, and updates — all in one place.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hackathons.map((h) => (
        <Link
          key={h.id}
          href={`/hackathons/${h.slug}`}
          className="block rounded-2xl border-2 border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card/40 to-card/40 backdrop-blur-sm p-5 hover:border-rose-500/40 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-500/20 text-rose-400 uppercase tracking-wider">
                  {h.status}
                </span>
                {h.mode && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {h.mode}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg">{h.title}</h3>
              {h.tagline && (
                <p className="text-sm text-muted-foreground mt-1">
                  {h.tagline}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                {h.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(h.start_date), 'MMM d, yyyy')}
                  </span>
                )}
                {h.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {h.location}
                  </span>
                )}
                {h.prize_pool && (
                  <span className="text-amber-500 font-medium">
                    🏆 {h.prize_pool}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
