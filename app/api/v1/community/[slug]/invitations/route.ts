import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { createInvitation } from '@/lib/community'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    let communityId = slug
    if (!slug.includes('-') || slug.length < 32) {
      const { data: c } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!c) throw new NotFoundError('Community', slug)
      communityId = c.id
    }

    const result = await createInvitation(supabase, ctx.identityId, communityId, body, ctx.requestId)

    return ok(
      {
        invitation_id: result.invitation_id,
        invite_url: `/community/invite/${result.raw_token}`,
      },
      { ctx, eventId: result.event_id, status: 201 }
    )
  } catch (err) {
    return fail(err, ctx)
  }
}