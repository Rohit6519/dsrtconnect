import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { getCommunityCategories } from '@/lib/community/discover'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const items = await getCommunityCategories(supabase)
    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}