import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, parseCursorParams, buildCursorPage, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const { limit, cursor } = parseCursorParams(req.nextUrl.searchParams)

    let query = supabase
      .from('notifications')
      .select('*')
      .or(`recipient_id.eq.${ctx.identityId},user_id.eq.${ctx.identityId}`)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: rows, error } = await query
    if (error) throw error

    const page = buildCursorPage(rows || [], limit, (row) => ({ created_at: row.created_at }))

    return ok(page, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}