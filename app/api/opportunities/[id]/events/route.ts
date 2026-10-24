import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent, OPP_EVENT_TYPES } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json().catch(() => ({}))

  const event_type = body.event_type as string
  if (!event_type || !OPP_EVENT_TYPES.includes(event_type as any)) {
    // allow custom but require non-empty
    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 })
    }
  }

  // Ensure opportunity exists
  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, poster_user_id')
    .eq('id', id)
    .maybeSingle()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await trackOpportunityEvent({
    event_id: body.event_id,
    opportunity_id: id,
    user_id: user?.id || null,
    session_id: body.session_id || null,
    event_type,
    source: body.source || 'direct',
    referrer_url: body.referrer_url || null,
    metadata: {
      ...(body.metadata || {}),
      device: body.device || body.metadata?.device || null,
    },
  })

  return NextResponse.json(result)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const cursor = searchParams.get('cursor')

  const { data: opp } = await supabase
    .from('opportunities')
    .select('poster_user_id')
    .eq('id', id)
    .single()

  if (!opp || opp.poster_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let q = supabase
    .from('opportunity_events')
    .select('*')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) q = q.lt('created_at', cursor)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    events: data || [],
    nextCursor: data && data.length === limit ? data[data.length - 1].created_at : null,
  })
}