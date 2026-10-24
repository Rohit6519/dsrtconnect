import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { searchGlobal } from '@/lib/community/discover'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const q = req.nextUrl.searchParams.get('q') || ''
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '5'), 20)

    const results = await searchGlobal(supabase, q, limit)
    
    return ok(results, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}