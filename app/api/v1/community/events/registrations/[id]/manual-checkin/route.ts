import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { manualCheckin } from '@/lib/community/service.events'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const result = await manualCheckin(supabase, ctx.identityId, id, ctx.requestId)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}