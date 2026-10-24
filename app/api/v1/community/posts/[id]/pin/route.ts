import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { pinPost } from '@/lib/community/service.posts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    await pinPost(supabase, ctx.identityId, id, !!body.pin, ctx.requestId)
    return ok({ pinned: !!body.pin }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}