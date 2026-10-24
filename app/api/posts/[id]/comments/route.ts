import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') || 'latest'
  try {
    let q = supabase.from('post_comments').select('*').eq('post_id', id).is('parent_id', null).limit(60)
    if (sort === 'top') q = q.order('like_count', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    else q = q.order('created_at', { ascending: false })
    const { data: comments, error } = await q
    if (error) throw error
    const items = comments || []
    if (items.length === 0) return NextResponse.json({ comments: [] })
    const parentIds = items.map(c => c.id)
    const { data: replies } = await supabase.from('post_comments').select('*').in('parent_id', parentIds).order('created_at', { ascending: true })
    const allComments = [...items, ...(replies || [])]
    const userIds = [...new Set(allComments.map((c: any) => c.user_id).filter(Boolean))]
    const { data: users } = userIds.length ? await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', userIds) : { data: [] as any[] }
    const userMap = new Map((users || []).map((u: any) => [u.id, u]))
    const repliesByParent = new Map<string, any[]>()
    for (const r of (replies || []) as any[]) {
      const arr = repliesByParent.get(r.parent_id) || []
      arr.push({ ...r, user: userMap.get(r.user_id) || null, is_liked: false })
      repliesByParent.set(r.parent_id, arr)
    }
    const enriched = items.map((c: any) => ({ ...c, user: userMap.get(c.user_id) || null, is_liked: false, replies: repliesByParent.get(c.id) || [] }))
    return NextResponse.json({ comments: enriched })
  } catch (e: any) { return NextResponse.json({ comments: [], error: e?.message }, { status: 500 }) }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const content = (body.content || '').trim()
  const parentId = body.parent_id || null
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: 'Too long' }, { status: 400 })
  try {
    const { data: comment, error } = await supabase.from('post_comments').insert({ post_id: id, user_id: user.id, parent_id: parentId, content }).select().single()
    if (error) throw error
    const { data: cur } = await supabase.from('posts').select('comment_count').eq('id', id).single()
    if (cur) await supabase.from('posts').update({ comment_count: (cur.comment_count || 0) + 1 }).eq('id', id).then(() => {}, () => {})
    const { data: userP } = await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').eq('id', user.id).single()
    return NextResponse.json({ comment: { ...comment, user: userP, is_liked: false, replies: [] } }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}