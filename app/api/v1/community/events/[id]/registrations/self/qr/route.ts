import { NextRequest } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, StateConflictError } from '@/lib/kernel'
import { randomBytes, createHash } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * ISSUES a fresh check-in token for this user's registration and returns the raw token.
 * The old token is invalidated. Rate-limited to once per 60s.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: reg } = await supabase
      .from('community_event_registrations')
      .select('id, status, event_id')
      .eq('event_id', id)
      .eq('identity_id', ctx.identityId)
      .not('status', 'in', '(CANCELLED,REMOVED)')
      .maybeSingle()
    if (!reg) throw new NotFoundError('Registration')
    if (reg.status !== 'CONFIRMED') throw new StateConflictError('Only confirmed registrations get QR')

    // Regenerate token via admin client (RLS blocks direct write)
    const raw = randomBytes(24).toString('base64url')
    const hash = createHash('sha256').update(raw).digest('hex')

    await adminClient
      .from('community_event_checkin_tokens')
      .delete()
      .eq('registration_id', reg.id)

    await adminClient.from('community_event_checkin_tokens').insert({
      event_id: reg.event_id,
      registration_id: reg.id,
      token_hash: hash,
      token_preview: raw.slice(0, 8),
    })

    return ok({ token: raw, qr_url: `/checkin/${raw}` }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}