import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { RateLimitService } from '@/lib/auth/RateLimitService'
import { hashWithSecret } from '@/lib/auth/hash'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { email, password, fullName, dob } = await request.json()
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanName = String(fullName || '').trim()

    if (!cleanEmail || !password || !cleanName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Rate limiter (production only)
    if (process.env.NODE_ENV === 'production') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
      const rl = new RateLimitService(adminClient)
      const limit = await rl.check(`SIGNUP:IP:${hashWithSecret(ip)}`, 100, 3600)
      if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many signups from this network. Please try later.' }, { status: 429 })
      }
    }

    // Create user via Supabase Auth (auto-triggers handle_new_user_adaptive)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: cleanName, dob: dob || null }
      }
    })

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 400 })
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: 'Signup failed unexpectedly' }, { status: 500 })
    }

    // Persist extra profile data (dob, full_name)
    await adminClient
      .from('users')
      .update({
        full_name: cleanName,
        dob: dob || null,
        signup_source: 'email',
        updated_at: new Date().toISOString()
      })
      .eq('id', signUpData.user.id)

    return NextResponse.json({
      success: true,
      user_id: signUpData.user.id,
      email: cleanEmail,
      next: '/auth/username'
    })
  } catch (err: any) {
    console.error('[Signup API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}