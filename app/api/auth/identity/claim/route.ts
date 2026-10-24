import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { username } = await request.json()
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

    const { data, error } = await adminClient.rpc('claim_dsrt_identity', {
      p_user_id: user.id,
      p_username: username
    })

    if (error) {
      return NextResponse.json({ error: 'Claim failed', details: error.message }, { status: 500 })
    }

    if (!data?.success) {
      return NextResponse.json({ error: data.reason || 'Could not claim username', code: data.code }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      username: data.username,
      dsrt_email: data.dsrt_email,
      next: '/onboarding'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}