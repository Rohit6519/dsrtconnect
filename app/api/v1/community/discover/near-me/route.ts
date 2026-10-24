import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { getNearMeCommunities } from '@/lib/community/discover'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '6'), 12)

    const items = await getNearMeCommunities(supabase, ctx.identityId, limit)
    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}