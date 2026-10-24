import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { listCommunityAudit } from '@/lib/community/service.studio'

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

    const sp = req.nextUrl.searchParams
    const page = await listCommunityAudit(
      supabase,
      ctx.identityId,
      community.id,
      sp.get('cursor'),
      Math.min(parseInt(sp.get('limit') || '30'), 100)
    )

    return ok(page, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}