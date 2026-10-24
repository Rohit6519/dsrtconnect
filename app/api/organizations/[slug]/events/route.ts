import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ events: [] })

  const { data } = await supabase
    .from('community_events')
    .select('id, title, description, event_type, category, start_time, end_time, location, is_online, meeting_url, banner_url, cover_image, registration_url, attendee_count')
    .eq('organization_id', org.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(10)

  return NextResponse.json({ events: data || [] })
}