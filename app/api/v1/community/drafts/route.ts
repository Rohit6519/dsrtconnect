import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { createDraft, listMyDrafts } from '@/lib/community/service.drafts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const drafts = await listMyDrafts(supabase, ctx.identityId)
    return ok({ drafts }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function POST(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const draft = await createDraft(supabase, ctx.identityId)
    return ok({ draft }, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}