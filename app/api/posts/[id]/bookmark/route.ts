import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await supabase.from('post_bookmarks').upsert({ post_id: id, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
    const { data: cur } = await supabase.from('posts').select('bookmark_count').eq('id', id).single()
    if (cur) await supabase.from('posts').update({ bookmark_count: (cur.bookmark_count || 0) + 1 }).eq('id', id).then(() => {}, () => {})
    return NextResponse.json({ bookmarked: true })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await supabase.from('post_bookmarks').delete().eq('post_id', id).eq('user_id', user.id)
  const { data: cur } = await supabase.from('posts').select('bookmark_count').eq('id', id).single()
  if (cur && (cur.bookmark_count || 0) > 0) await supabase.from('posts').update({ bookmark_count: (cur.bookmark_count || 0) - 1 }).eq('id', id).then(() => {}, () => {})
  return NextResponse.json({ bookmarked: false })
}