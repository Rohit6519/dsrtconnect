import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: comment } = await supabase.from('post_comments').select('user_id').eq('id', commentId).single()
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (comment.user_id !== user.id) {
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', id).single()
    if (!post || post.user_id !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }
  await supabase.from('post_comments').delete().eq('id', commentId)
  const { data: cur } = await supabase.from('posts').select('comment_count').eq('id', id).single()
  if (cur && (cur.comment_count || 0) > 0) await supabase.from('posts').update({ comment_count: (cur.comment_count || 0) - 1 }).eq('id', id).then(() => {}, () => {})
  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { commentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'like'
  try {
    if (action === 'like') {
      await supabase.from('post_comment_likes').upsert({ comment_id: commentId, user_id: user.id }, { onConflict: 'comment_id,user_id', ignoreDuplicates: true }).then(() => {}, () => {})
      const { data: cur } = await supabase.from('post_comments').select('like_count').eq('id', commentId).single()
      if (cur) await supabase.from('post_comments').update({ like_count: (cur.like_count || 0) + 1 }).eq('id', commentId).then(() => {}, () => {})
    } else {
      await supabase.from('post_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id).then(() => {}, () => {})
      const { data: cur } = await supabase.from('post_comments').select('like_count').eq('id', commentId).single()
      if (cur && (cur.like_count || 0) > 0) await supabase.from('post_comments').update({ like_count: (cur.like_count || 0) - 1 }).eq('id', commentId).then(() => {}, () => {})
    }
    return NextResponse.json({ success: true, action })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}