import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { venture_id, module_type, position, session_id } = await request.json()
    if (!venture_id) return NextResponse.json({ error: 'venture_id required' }, { status: 400 })

    await supabase.from('explore_impressions').insert({
      user_id: user?.id || null,
      venture_id,
      module_type: module_type || 'recommended',
      position: position || 0,
      session_id
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}