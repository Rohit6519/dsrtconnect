import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  try {
    const { data: events } = await supabase
      .from('community_events')
      .select(`
        *,
        communities:community_id (name, slug)
      `)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5)

    // Enrich with attendee counts
    const eventIds = (events || []).map((e: any) => e.id)
    let attendeeCounts: Record<string, number> = {}
    
    if (eventIds.length > 0) {
      const { data: attendees } = await supabase
        .from('event_attendees')
        .select('event_id')
        .in('event_id', eventIds)

      ;(attendees || []).forEach((a: any) => {
        attendeeCounts[a.event_id] = (attendeeCounts[a.event_id] || 0) + 1
      })
    }

    const enrichedEvents = (events || []).map((e: any) => ({
      ...e,
      attendee_count: attendeeCounts[e.id] || 0,
      community_name: e.communities?.name || 'Community',
      community_slug: e.communities?.slug,
    }))

    return NextResponse.json({ events: enrichedEvents })
  } catch (error) {
    return NextResponse.json({ events: [] })
  }
}