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
      .from('project_review_likes')
      .select('review_id')
      .eq('review_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('project_review_likes')
        .delete()
        .eq('review_id', id)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ liked: false })
    } else {
      const { error } = await supabase
        .from('project_review_likes')
        .insert({ review_id: id, user_id: user.id })
      if (error) throw error
      return NextResponse.json({ liked: true })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
