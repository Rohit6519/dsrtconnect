import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { createEvent } from '@/lib/events/service.events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const nowIso = new Date().toISOString()
    const { data: events } = await supabase
      .from('event_events')
      .select('*, event_schedules(starts_at, ends_at, is_primary), event_locations(*), event_registration_config(*)')
      .eq('community_id', community.id)
      .in('status', ['PUBLISHED', 'LIVE', 'ENDED'])
      .order('created_at', { ascending: false })
      .limit(50)

    const upcoming: any[] = []
    const past: any[] = []
    for (const e of (events || []) as any[]) {
      const primary = (e.event_schedules || []).find((s: any) => s.is_primary) || (e.event_schedules || [])[0]
      if (primary && primary.starts_at >= nowIso) upcoming.push(e)
      else past.push(e)
    }
    return ok({ upcoming, past }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const body = await req.json().catch(() => ({}))
    const result = await createEvent(supabase, ctx.identityId, { ...body, community_id: community.id }, ctx.requestId)
    return ok(result, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}