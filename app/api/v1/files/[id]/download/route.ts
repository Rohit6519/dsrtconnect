import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, getSignedDownloadUrl, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const download = await getSignedDownloadUrl(supabase, id, ctx.identityId)

    return ok(download, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}