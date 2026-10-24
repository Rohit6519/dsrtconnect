import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { listEventRegistrations } from '@/lib/community/service.events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const sp = req.nextUrl.searchParams
    const page = await listEventRegistrations(
      supabase, ctx.identityId, id,
      sp.get('status') || 'ALL',
      sp.get('cursor'),
      Math.min(parseInt(sp.get('limit') || '50'), 200),
    )
    return ok(page, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}