import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, user:users!post_comments_user_id_fkey(id, full_name, username, avatar_url, is_verified)')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ comments: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, comments: [] }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const content = (body.content || '').trim()
    if (!content || content.length < 1) {
      return NextResponse.json({ error: 'Empty comment' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: id,
        user_id: user.id,
        parent_id: body.parent_id || null,
        content: content.slice(0, 2000),
      })
      .select('*, user:users!post_comments_user_id_fkey(id, full_name, username, avatar_url, is_verified)')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, comment: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
