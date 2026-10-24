import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { getNetworkSummary } from '@/lib/community/network'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const summary = await getNetworkSummary(supabase, ctx.identityId)
    return ok(summary, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}