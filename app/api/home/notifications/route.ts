import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/home/notifications?limit=20&cursor=<iso>
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [] })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')

  try {
    let query = supabase
      .from('home_notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) query = query.lt('created_at', cursor)

    const { data: rows, error } = await query
    if (error) throw error

    const items = (rows || []).slice(0, limit)
    const hasMore = (rows || []).length > limit
    const nextCursor = hasMore ? items[items.length - 1]?.created_at : null

    if (items.length === 0) {
      return NextResponse.json({ notifications: [], hasMore: false, nextCursor: null })
    }

    // Enrich with actor + post preview
    const actorIds = [...new Set(items.map(n => n.actor_id).filter(Boolean))]
    const postIds = [...new Set(items.map(n => n.post_id).filter(Boolean))]

    const [actorsRes, postsRes] = await Promise.all([
      actorIds.length
        ? supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', actorIds)
        : { data: [] as any[] },
      postIds.length
        ? supabase.from('posts').select('id, content, content_text, title, publisher_type, publisher_id').in('id', postIds)
        : { data: [] as any[] },
    ])

    // For venture actors, also fetch venture data
    const ventureActorIds = items
      .filter(n => n.actor_publisher_type === 'venture' && n.actor_publisher_id)
      .map(n => n.actor_publisher_id)
    const uniqueVentureIds = [...new Set(ventureActorIds)]
    const { data: ventures } = uniqueVentureIds.length
      ? await supabase.from('ventures').select('id, slug, name, logo_url, is_verified').in('id', uniqueVentureIds)
      : { data: [] as any[] }

    const actorMap = new Map((actorsRes.data || []).map((u: any) => [u.id, u]))
    const postMap = new Map((postsRes.data || []).map((p: any) => [p.id, p]))
    const ventureMap = new Map((ventures || []).map((v: any) => [v.id, v]))

    const enriched = items.map((n: any) => {
      const actor = actorMap.get(n.actor_id) || null
      const post = n.post_id ? postMap.get(n.post_id) : null
      const actorVenture = n.actor_publisher_type === 'venture' && n.actor_publisher_id
        ? ventureMap.get(n.actor_publisher_id)
        : null

      return {
        ...n,
        actor,
        actor_venture: actorVenture,
        post_preview: post ? {
          id: post.id,
          content: (post.content || post.content_text || post.title || '').slice(0, 200),
        } : null,
      }
    })

    return NextResponse.json({
      notifications: enriched,
      hasMore,
      nextCursor,
    })
  } catch (e: any) {
    console.error('List notifications error:', e)
    return NextResponse.json({ notifications: [], error: e?.message }, { status: 500 })
  }
}