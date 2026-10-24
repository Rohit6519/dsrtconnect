import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetId, action } = await request.json()
  if (!targetId || !['follow', 'unfollow'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (targetId === user.id) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  if (action === 'follow') {
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_type: 'user',
        following_id: targetId,
      })
    
    // Ignore duplicate key errors if already following
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Track signal for algorithm
    supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'follow',
      entity_type: 'user',
      entity_id: targetId,
      weight: 8,
    }).then(() => {}, () => {})

  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_type', 'user')
      .eq('following_id', targetId)
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return fresh counts
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_type', 'user').eq('following_id', targetId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetId).eq('following_type', 'user'),
  ])

  return NextResponse.json({ 
    ok: true, 
    followerCount: followers || 0,
    followingCount: following || 0 
  })
}