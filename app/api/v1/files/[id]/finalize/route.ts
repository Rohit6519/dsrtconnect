import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, finalizeUpload, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const file = await finalizeUpload(supabase, id, ctx.identityId)

    return ok(file, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}