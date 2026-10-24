import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { getAllCommunities } from '@/lib/community/discover'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const sp = req.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '18'), 48)
    const cursor = sp.get('cursor')

    const filters = {
      category: sp.get('category') || undefined,
      community_type: sp.get('community_type') || undefined,
      join_policy: sp.get('join_policy') || undefined,
      visibility: sp.get('visibility') || undefined,
      verified_only: sp.get('verified_only') === 'true',
      location: sp.get('location') || undefined,
      sort: (sp.get('sort') as 'members' | 'newest' | 'active') || 'members',
    }

    const page = await getAllCommunities(supabase, ctx.identityId, filters, cursor, limit)
    return ok(page, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}