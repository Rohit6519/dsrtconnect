import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { listApplications } from '@/lib/looking-for/service.applications'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const sp = req.nextUrl.searchParams
    const result = await listApplications(supabase, ctx.identityId, id, {
      stage: sp.get('stage') as any,
      cursor: sp.get('cursor') || undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
    })
    return ok(result, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}