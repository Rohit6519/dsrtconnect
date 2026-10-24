import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id, user_id, founder_id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (venture.user_id === user.id || venture.founder_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow own venture' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_type', 'venture')
      .eq('following_id', venture.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('id', existing.id)
      if (error) throw error

      await supabase.from('user_activity_signals').insert({
        user_id: user.id, signal_type: 'unfollow',
        entity_type: 'venture', entity_id: venture.id, weight: -1.0,
      }).then(() => {}, () => {})

      return NextResponse.json({ following: false })
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_type: 'venture',
          following_id: venture.id,
        })
      if (error) throw error

      await supabase.from('user_activity_signals').insert({
        user_id: user.id, signal_type: 'follow',
        entity_type: 'venture', entity_id: venture.id, weight: 4.0,
      }).then(() => {}, () => {})

      return NextResponse.json({ following: true })
    }
  } catch (e: any) {
    console.error('Follow venture error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
