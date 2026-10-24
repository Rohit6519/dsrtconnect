import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { getNetworkPeople } from '@/lib/community/network'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const sp = req.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '24'), 60)
    const cursor = sp.get('cursor')
    const page = await getNetworkPeople(supabase, ctx.identityId, cursor, limit)
    return ok(page, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}