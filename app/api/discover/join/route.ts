import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { community_id } = await request.json()
  if (!community_id) return NextResponse.json({ error: 'Missing community_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('community_members')
    .insert({
      community_id,
      user_id: user.id,
      role: 'member',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already joined' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Track activity signal for algorithm (fire and forget, silent fail)
  try {
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'join_community',
      entity_type: 'community',
      entity_id: community_id,
      weight: 5.0,
    })
  } catch { /* silent */ }

  return NextResponse.json({ success: true, membership: data })
}