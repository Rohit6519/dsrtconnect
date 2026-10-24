import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { assignCase } from '@/lib/community/service.moderation'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    await assignCase(supabase, ctx.identityId, id, ctx.requestId)
    return ok({ assigned: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}