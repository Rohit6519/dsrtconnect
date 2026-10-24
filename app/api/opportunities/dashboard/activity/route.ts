import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '20'), 50)

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, slug')
    .eq('poster_user_id', user.id)

  const oppMap = new Map((opps || []).map(o => [o.id, o]))
  const oppIds = Array.from(oppMap.keys())

  if (oppIds.length === 0) return NextResponse.json({ events: [] })

  // Pull latest opp events + recent applications
  const [{ data: events }, { data: apps }] = await Promise.all([
    supabase
      .from('opportunity_events')
      .select('id, opportunity_id, event_type, source, created_at, metadata')
      .in('opportunity_id', oppIds)
      .in('event_type', [
        'application_submitted',
        'applicant_shortlisted',
        'applicant_selected',
        'applicant_rejected',
        'opportunity_paused',
        'opportunity_resumed',
        'opportunity_closed',
        'opportunity_published',
      ])
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id, created_at, applicant_snapshot')
      .in('opportunity_id', oppIds)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const items = (events || []).map(ev => ({
    id: ev.id,
    type: ev.event_type,
    at: ev.created_at,
    opportunity: oppMap.get(ev.opportunity_id) || null,
    meta: ev.metadata || {},
  }))

  return NextResponse.json({ events: items })
}