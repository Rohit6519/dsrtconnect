import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { banner_id, event_type, session_id } = await request.json()
    
    if (!banner_id || !event_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await supabase.from('banner_events').insert({
      banner_id,
      user_id: user?.id || null,
      event_type, // 'impression' or 'click'
      session_id
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}