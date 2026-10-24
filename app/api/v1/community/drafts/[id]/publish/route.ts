import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { publishDraft } from '@/lib/community/service.drafts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const result = await publishDraft(supabase, ctx.identityId, id, ctx.requestId)
    return ok(result, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}