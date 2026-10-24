import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  const { data: events } = await supabase
    .from('community_events')
    .select('id, title, description, start_time, end_time, location, is_online, meeting_url, registration_url, attendee_count, community_id, communities:community_id(name, slug)')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(10)

  return NextResponse.json({ events: events || [] })
}