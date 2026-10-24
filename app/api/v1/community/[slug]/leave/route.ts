import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { leaveCommunity } from '@/lib/community'

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

    const result = await leaveCommunity(supabase, ctx.identityId, communityId, ctx.requestId)

    return ok({ success: true }, { ctx, eventId: result.event_id })
  } catch (err) {
    return fail(err, ctx)
  }
}