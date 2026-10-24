import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RateLimitService } from '@/lib/auth/RateLimitService'
import { hashWithSecret } from '@/lib/auth/hash'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { email } = await request.json()
    const cleanEmail = String(email || '').trim().toLowerCase()

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
    const rl = new RateLimitService(supabase)
    
    // Strict Rate Limiting
    const ipLimit = await rl.check(`FORGOT_PWD:IP:${hashWithSecret(ip)}`, 5, 3600)
    const emailLimit = await rl.check(`FORGOT_PWD:EMAIL:${hashWithSecret(cleanEmail)}`, 3, 3600)

    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: 'Too many reset requests. Please wait before trying again.' }, { status: 429 })
    }

    // Dispatch secure PKCE password reset email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${appUrl}/callback?next=/reset-password`
    })

    // Log security event
    const { data: userData } = await supabase.from('users').select('id').ilike('email', cleanEmail).maybeSingle()
    if (userData?.id) {
      await supabase.from('security_events').insert({
        user_id: userData.id,
        event_type: 'PASSWORD_RESET_REQUESTED',
        success: !error,
        ip_hash: hashWithSecret(ip)
      })
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}