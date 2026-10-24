import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { trackDiscoverEvent } from '@/lib/community/discover'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const events = body?.events || []

    await trackDiscoverEvent(supabase, ctx.identityId, events)
    return ok({ recorded: events.length }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}