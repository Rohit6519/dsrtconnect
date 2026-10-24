import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { venture_id, reason } = await request.json()
    if (!venture_id) return NextResponse.json({ error: 'venture_id required' }, { status: 400 })

    const { error } = await supabase
      .from('explore_negative_signals')
      .upsert({
        user_id: user.id,
        venture_id,
        reason: reason || 'not_relevant'
      }, { onConflict: 'user_id,venture_id' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}