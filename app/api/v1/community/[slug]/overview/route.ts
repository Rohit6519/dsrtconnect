import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, NotFoundError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id, slug, chat_enabled')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    // Latest announcement (best effort — tolerant of schema variance)
    let latestAnnouncement: any = null
    try {
      const { data } = await supabase
        .from('community_chat_messages')
        .select('id, content, created_at, user_id')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false })
        .limit(1)
      latestAnnouncement = (data || [])[0] || null
    } catch {
      latestAnnouncement = null
    }

    // Next upcoming event
    let upcomingEvent: any = null
    try {
      const { data } = await supabase
        .from('community_events')
        .select('id, title, description, start_time, end_time, location, is_online, cover_image, banner_url')
        .eq('community_id', community.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
      upcomingEvent = (data || [])[0] || null
    } catch {
      upcomingEvent = null
    }

    // Recent members
    const { data: recentMemberRows } = await supabase
      .from('community_memberships')
      .select('identity_id, joined_at')
      .eq('community_id', community.id)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: false })
      .limit(8)

    const recentIds = (recentMemberRows || []).map((m: any) => m.identity_id).filter(Boolean)
    const { data: recentUsers } =
      recentIds.length > 0
        ? await supabase
            .from('users')
            .select('id, username, full_name, avatar_url')
            .in('id', recentIds)
        : { data: [] as any[] }

    return ok(
      {
        latest_announcement: latestAnnouncement,
        upcoming_event: upcomingEvent,
        recent_members: recentUsers || [],
      },
      { ctx }
    )
  } catch (err) {
    return fail(err, ctx)
  }
}