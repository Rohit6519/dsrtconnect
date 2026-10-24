import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: existing } = await supabase
      .from('post_bookmarks')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('id', existing.id)
      if (error) throw error
      return NextResponse.json({ bookmarked: false })
    } else {
      const { error } = await supabase
        .from('post_bookmarks')
        .insert({ post_id: id, user_id: user.id })
      if (error) throw error
      return NextResponse.json({ bookmarked: true })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
