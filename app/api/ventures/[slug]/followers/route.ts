import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, follower_count')
    .eq('slug', slug)
    .single()

  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await supabase
    .from('venture_followers')
    .select('venture_id')
    .eq('venture_id', venture.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing.data) {
    // ─── UNFOLLOW ───
    await supabase
      .from('venture_followers')
      .delete()
      .eq('venture_id', venture.id)
      .eq('user_id', user.id)

    // Decrement denormalized counter (best-effort, never below 0)
    await supabase
      .from('ventures')
      .update({ follower_count: Math.max(0, (venture.follower_count || 1) - 1) })
      .eq('id', venture.id)
      .then(() => {}, () => {})

    // Log unfollow event for analytics chart
    await supabase
      .from('venture_follower_events')
      .insert({
        venture_id: venture.id,
        user_id: user.id,
        action: 'unfollow',
      })
      .then(() => {}, () => {})

    // Track signal for recommendation algorithm
    await supabase
      .from('user_activity_signals')
      .insert({
        user_id: user.id,
        signal_type: 'unfollow',
        entity_type: 'venture',
        entity_id: venture.id,
        weight: -3,
      })
      .then(() => {}, () => {})

    return NextResponse.json({ following: false })
  } else {
    // ─── FOLLOW ───
    await supabase
      .from('venture_followers')
      .insert({ venture_id: venture.id, user_id: user.id })

    // Increment denormalized counter
    await supabase
      .from('ventures')
      .update({ follower_count: (venture.follower_count || 0) + 1 })
      .eq('id', venture.id)
      .then(() => {}, () => {})

    // Log follow event for analytics chart
    await supabase
      .from('venture_follower_events')
      .insert({
        venture_id: venture.id,
        user_id: user.id,
        action: 'follow',
      })
      .then(() => {}, () => {})

    // Track signal for recommendation algorithm
    await supabase
      .from('user_activity_signals')
      .insert({
        user_id: user.id,
        signal_type: 'follow',
        entity_type: 'venture',
        entity_id: venture.id,
        weight: 6,
      })
      .then(() => {}, () => {})

    return NextResponse.json({ following: true })
  }
}