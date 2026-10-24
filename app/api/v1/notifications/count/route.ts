import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, getUnreadNotificationCount, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const unread = await getUnreadNotificationCount(supabase, ctx.identityId)

    return ok({ unread }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}