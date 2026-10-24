import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ValidationError } from '@/lib/kernel'
import { transferOwnership } from '@/lib/community/service.studio'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    if (!body.new_owner_identity_id) {
      throw new ValidationError([{ field: 'new_owner_identity_id', message: 'Required' }])
    }
    if (body.confirm !== 'TRANSFER OWNERSHIP') {
      throw new ValidationError([{ field: 'confirm', message: 'Confirmation phrase required' }])
    }

    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const result = await transferOwnership(
      supabase,
      ctx.identityId,
      community.id,
      body.new_owner_identity_id,
      ctx.requestId
    )

    return ok(result, { ctx, eventId: result.event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}