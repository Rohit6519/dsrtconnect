import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { updateEvent } from '@/lib/community/service.events'

export const dynamic = 'force-dynamic'

const FIELDS = `
  id, community_id, slug, public_id, title, tagline, description, event_type,
  cover_url, banner_url, status, is_online, location_text, meeting_url, timezone,
  starts_at, ends_at, registration_opens_at, registration_closes_at,
  published_at, cancelled_at, cancellation_reason, owner_identity_id, created_at, updated_at
`

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const idLooksLikeUUID = id.includes('-') && id.length >= 32
    let query = supabase.from('community_events_v2').select(FIELDS).limit(1)
    query = idLooksLikeUUID ? query.eq('id', id) : query.eq('slug', id)
    const { data: event } = await query.maybeSingle()
    if (!event) throw new NotFoundError('Event', id)

    const [{ data: config }, { data: myReg }] = await Promise.all([
      supabase.from('community_event_registration_config').select('*').eq('event_id', event.id).maybeSingle(),
      ctx.identityId
        ? supabase
            .from('community_event_registrations')
            .select('id, status, registration_number, waitlisted_at, confirmed_at')
            .eq('event_id', event.id)
            .eq('identity_id', ctx.identityId)
            .not('status', 'in', '(CANCELLED,REMOVED)')
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
    ])

    let myCheckinToken: string | null = null
    if (myReg && myReg.status === 'CONFIRMED') {
      const { data: token } = await supabase
        .from('community_event_checkin_tokens')
        .select('token_preview')
        .eq('registration_id', myReg.id)
        .maybeSingle()
      myCheckinToken = token?.token_preview || null
    }

    return ok({ event, config, my_registration: myReg, my_checkin_token_preview: myCheckinToken }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const updated = await updateEvent(supabase, ctx.identityId, id, body, ctx.requestId)
    return ok({ event: updated }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}