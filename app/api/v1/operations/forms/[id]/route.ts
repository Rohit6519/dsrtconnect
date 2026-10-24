import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, buildRequestContext, ok, fail } from '@/lib/kernel'
import { getForm, updateFormDraft } from '@/lib/operations/service.forms'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const sp = req.nextUrl.searchParams
    const versionNumber = sp.get('version') ? parseInt(sp.get('version')!) : undefined
    const data = await getForm(supabase, ctx.identityId || '', id, { versionNumber })
    return ok(data, { ctx })
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
    const result = await updateFormDraft(supabase, ctx.identityId, id, body, ctx.requestId)
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}