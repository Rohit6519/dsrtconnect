import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { getCaseDetail } from '@/lib/community/service.moderation'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const detail = await getCaseDetail(supabase, ctx.identityId, id)
    return ok(detail, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}