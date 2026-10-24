import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { getDraft, updateDraft, discardDraft } from '@/lib/community/service.drafts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const draft = await getDraft(supabase, ctx.identityId, id)
    return ok({ draft }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const draft = await updateDraft(
      supabase,
      ctx.identityId,
      id,
      body?.data ?? {},
      body?.step
    )
    return ok({ draft }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    await discardDraft(supabase, ctx.identityId, id)
    return ok({ discarded: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}