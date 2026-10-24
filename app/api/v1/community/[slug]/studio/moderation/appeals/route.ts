import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { listAppeals } from '@/lib/community/service.moderation'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const status = req.nextUrl.searchParams.get('status') || 'SUBMITTED,UNDER_REVIEW'
    const items = await listAppeals(supabase, ctx.identityId, community.id, status)
    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}