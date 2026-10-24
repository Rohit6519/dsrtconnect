import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await adminClient.rpc('check_username_availability', {
      p_username: username,
      p_user_id: user?.id || null
    })

    if (error) {
      return NextResponse.json({ available: false, reason: 'Check failed' }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ available: false, reason: err.message }, { status: 500 })
  }
}