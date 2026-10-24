import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const communityId = body?.community_id
    if (!communityId) return ok({ dismissed: false }, { ctx })

    await supabase
      .from('community_discover_dismissals')
      .upsert({ identity_id: ctx.identityId, community_id: communityId })

    return ok({ dismissed: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}