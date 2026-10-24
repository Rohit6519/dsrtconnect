import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, ValidationError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const sp = req.nextUrl.searchParams
    const targetType = sp.get('target_type')
    const targetId = sp.get('target_id')
    if (!targetType || !targetId) {
      throw new ValidationError([{ field: 'target_id', message: 'target_type and target_id required' }])
    }

    const { data: comments } = await supabase
      .from('community_comments')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .is('deleted_at', null)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .limit(50)

    // Fetch replies for these top-level comments
    const parentIds = (comments || []).map((c: any) => c.id)
    const { data: replies } = parentIds.length > 0
      ? await supabase
          .from('community_comments')
          .select('*')
          .in('parent_comment_id', parentIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
      : { data: [] as any[] }

    // Author enrichment
    const authorIds = Array.from(new Set([...(comments || []), ...(replies || [])].map((c: any) => c.author_identity_id)))
    const { data: authors } = authorIds.length > 0
      ? await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', authorIds)
      : { data: [] as any[] }
    const authorMap = new Map((authors || []).map((u: any) => [u.id, u]))

    // User reactions
    const commentIds = [...(comments || []), ...(replies || [])].map((c: any) => c.id)
    let reactionMap = new Map<string, string>()
    if (ctx.identityId && commentIds.length > 0) {
      const { data: rx } = await supabase
        .from('community_reactions')
        .select('target_id, reaction_type')
        .eq('target_type', 'comment')
        .eq('identity_id', ctx.identityId)
        .in('target_id', commentIds)
      reactionMap = new Map((rx || []).map((r: any) => [r.target_id, r.reaction_type]))
    }

    const enrich = (c: any) => ({
      ...c,
      author: authorMap.get(c.author_identity_id) ?? null,
      my_reaction: reactionMap.get(c.id) || null,
    })

    const repliesByParent = new Map<string, any[]>()
    for (const r of (replies || []) as any[]) {
      const arr = repliesByParent.get(r.parent_comment_id) || []
      arr.push(enrich(r))
      repliesByParent.set(r.parent_comment_id, arr)
    }

    const items = (comments || []).map((c: any) => ({
      ...enrich(c),
      replies: repliesByParent.get(c.id) || [],
    }))

    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}