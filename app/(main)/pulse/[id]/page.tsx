import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react'
import { EditorialEngagement } from '@/components/editorial/EditorialEngagement'
import Link from 'next/link'
import { Markdown } from '@/components/shared/Markdown'

interface PageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

const CATEGORY_ICONS: Record<string, string> = {
  startups: '🚀',
  technology: '💻',
  'ai-robotics': '🤖',
  finance: '💰',
  biotech: '🧬',
  climate: '🌱',
  space: '🌌',
  aviation: '✈️',
  default: '📰',
}

export default async function PulsePostPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: post } = await supabase
    .from('editorial_posts')
    .select('*, editorial_categories(*)')
    .eq('id', params.id)
    .single()

  if (!post) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  await supabase
    .from('editorial_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('id', params.id)

  let userLiked = false
  if (user) {
    const { data: like } = await supabase
      .from('editorial_likes')
      .select('id')
      .eq('editorial_post_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()
    userLiked = !!like
  }

  const { data: comments } = await supabase
    .from('editorial_comments')
    .select('*, users(id, full_name, username, avatar_url)')
    .eq('editorial_post_id', params.id)
    .order('created_at', { ascending: true })

  const slug = post.editorial_categories?.slug || 'default'
  const icon = CATEGORY_ICONS[slug] || CATEGORY_ICONS.default

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/pulse"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Builder Pulse
      </Link>

      <article className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="p-6 md:p-10 space-y-6">
          {/* Category header */}
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{icon}</span>
              <span
                className="px-2.5 py-1 rounded-full font-medium text-xs"
                style={{
                  backgroundColor: `${post.editorial_categories?.color}20`,
                  color: post.editorial_categories?.color,
                }}
              >
                {post.editorial_categories?.name}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {format(new Date(post.published_at), 'MMM d, yyyy')} ·{' '}
              {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
            </span>
          </div>

          {/* DSRT Editorial byline */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/40">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 flex items-center justify-center border-2 border-amber-300/50 shadow-lg shadow-amber-500/20">
                <span className="text-white font-bold text-sm drop-shadow">D</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-sm">DSRT Editorial</p>
                <span className="text-[9px] font-bold text-amber-600 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  DSRT
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Official news desk
                {post.source_name && ` · via ${post.source_name}`}
              </p>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {post.headline}
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {post.summary}
          </p>

          {post.body && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown content={post.body} />
            </div>
          )}

          {post.why_it_matters && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">Why it matters</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {post.why_it_matters}
              </p>
            </div>
          )}

          {post.related_topics && post.related_topics.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Projects You Could Build Inspired By This
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {post.related_topics.map((topic: string, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/40 bg-background/40 p-3 text-sm flex items-start gap-2"
                  >
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-4 border-t border-border/40">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {post.source_url && (
            <div className="pt-4 border-t border-border/40">
              <a
                href={post.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Read original source →
              </a>
            </div>
          )}

          <EditorialEngagement
            postId={post.id}
            initialLikes={post.like_count || 0}
            initialUserLiked={userLiked}
            initialComments={comments || []}
            currentUser={user}
          />
        </div>
      </article>
    </div>
  )
}