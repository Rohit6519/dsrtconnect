import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { getRecommendedCommunities } from '@/lib/community/discover'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '12'), 24)

    const items = await getRecommendedCommunities(supabase, ctx.identityId, limit)
    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}