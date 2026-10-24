import { createClient } from '@/lib/supabase/server'
import { PulseTabs } from '@/components/pulse/PulseTabs'
import { AutoRefresh } from '@/components/shared/AutoRefresh'
export const revalidate = 0
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { channel?: string }
}

export default async function PulsePage({ searchParams }: PageProps) {
  const supabase = createClient()
  const channel = searchParams.channel || 'all'

  let query = supabase
    .from('editorial_posts')
    .select('*, editorial_categories(*)')
    .order('published_at', { ascending: false })
    .limit(50)

  if (channel !== 'all' && channel !== 'intel' && channel !== 'hackathons') {
    query = query.eq('channel', channel)
  }

  const { data: posts } = await query

  // Get DSRT Intel features
  const { data: intelFeatures } =
    channel === 'intel' || channel === 'all'
      ? await supabase
          .from('dsrt_intel_features')
          .select(
            '*, users:featured_user_id(id, full_name, username, avatar_url, tagline), startups:featured_venture_id(id, name, slug, tagline), projects:featured_project_id(id, title, slug, tagline)'
          )
          .eq('is_active', true)
          .order('featured_at', { ascending: false })
          .limit(20)
      : { data: [] }

  // Get hackathons
  const { data: hackathons } =
    channel === 'hackathons' || channel === 'all'
      ? await supabase
          .from('hackathons')
          .select('*')
          .order('start_date', { ascending: true })
          .limit(20)
      : { data: [] }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <AutoRefresh />

      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            DSRT Editorial · Live
          </p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Builder Pulse
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          The pulse of the builder ecosystem. Research, builders, intel, and
          hackathons.
        </p>
      </div>

      <PulseTabs
        currentChannel={channel}
        posts={posts || []}
        intelFeatures={intelFeatures || []}
        hackathons={hackathons || []}
      />
    </div>
  )
}