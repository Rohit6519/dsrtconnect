import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, markAllNotificationsRead, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    await markAllNotificationsRead(supabase, ctx.identityId)

    return ok({ success: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}