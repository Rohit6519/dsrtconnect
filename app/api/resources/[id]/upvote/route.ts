import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sign in to upvote' }, { status: 401 })

  try {
    const { data: existing } = await supabase
      .from('resource_upvotes')
      .select('user_id')
      .eq('resource_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from('resource_upvotes').delete().eq('resource_id', id).eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ upvoted: false })
    } else {
      const { error } = await supabase.from('resource_upvotes').insert({ resource_id: id, user_id: user.id })
      if (error) throw error
      return NextResponse.json({ upvoted: true })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
