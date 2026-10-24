import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, parseCursorParams } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const { limit, cursor } = parseCursorParams(req.nextUrl.searchParams)

    let query = supabase
      .from('ecosystem_activity')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) query = query.lt('occurred_at', cursor)

    const { data: rows, error } = await query
    if (error) throw error

    const arr = (rows || []) as any[]
    const hasMore = arr.length > limit
    const items = hasMore ? arr.slice(0, limit) : arr
    const last = items[items.length - 1]
    const nextCursor = hasMore && last ? last.occurred_at : null

    // Enrich actors
    const actorIds = Array.from(new Set(items.map((a) => a.actor_id).filter(Boolean)))
    const { data: actors } = actorIds.length > 0
      ? await supabase.from('users').select('id, username, full_name, avatar_url').in('id', actorIds)
      : { data: [] as any[] }
    const actorMap = new Map((actors || []).map((u: any) => [u.id, u]))

    return ok({
      items: items.map((a: any) => ({ ...a, actor: a.actor_id ? actorMap.get(a.actor_id) : null })),
      next_cursor: nextCursor,
      has_more: hasMore,
    }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}