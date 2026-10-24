import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, markNotificationRead, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    await markNotificationRead(supabase, id, ctx.identityId)

    return ok({ success: true, notification_id: id }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}