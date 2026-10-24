import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RateLimitService } from '@/lib/auth/RateLimitService'
import { hashWithSecret } from '@/lib/auth/hash'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const { password } = await request.json()
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
    const rl = new RateLimitService(supabase)
    const limit = await rl.check(`CHANGE_PWD:USER:${user.id}`, 5, 3600)

    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many password update attempts. Please wait.' }, { status: 429 })
    }

    // Update credential inside Supabase Auth
    const { error } = await supabase.auth.updateUser({ password })

    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'PASSWORD_CHANGED',
      success: !error,
      ip_hash: hashWithSecret(ip)
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}