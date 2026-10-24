import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { RateLimitService } from '@/lib/auth/RateLimitService'
import { SessionTracker } from '@/lib/auth/SessionTracker'
import { hashWithSecret } from '@/lib/auth/hash'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { identifier, password } = await request.json()
    const clean = String(identifier || '').trim().toLowerCase()

    if (!clean || !password) {
      return NextResponse.json({ error: 'Email or username and password required' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const ua = request.headers.get('user-agent') || ''

    // Rate limit
    if (process.env.NODE_ENV === 'production') {
      const rl = new RateLimitService(adminClient)
      const limit = await rl.check(`LOGIN:IP:${hashWithSecret(ip)}`, 30, 900)
      if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 })
      }
    }

    // Resolve identifier to email
    let loginEmail = clean
    if (!clean.includes('@')) {
      const { data: profile } = await adminClient
        .from('users')
        .select('email')
        .eq('normalized_username', clean)
        .maybeSingle()

      if (!profile?.email) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
      loginEmail = profile.email
    }

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    })

    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Track session (fire-and-forget, don't block response)
    SessionTracker.track({
      userId: data.user.id,
      accessToken: data.session.access_token,
      userAgent: ua,
      ip
    }).catch(() => {})

    // Get identity state to determine next route
    const { data: identity } = await adminClient
      .from('users')
      .select('normalized_username, onboarding_complete, account_status')
      .eq('id', data.user.id)
      .single()

    if (identity?.account_status === 'SUSPENDED' || identity?.account_status === 'LOCKED') {
      return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })
    }

    const hasRealUsername = !!(identity?.normalized_username && !identity.normalized_username.startsWith('pending_'))
    let next = '/home'
    if (!hasRealUsername) next = '/auth/username'
    else if (!identity?.onboarding_complete) next = '/onboarding'

    return NextResponse.json({ success: true, next })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 })
  }
}