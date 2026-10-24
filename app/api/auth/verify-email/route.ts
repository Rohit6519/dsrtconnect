import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { RateLimitService } from '@/lib/auth/RateLimitService'
import { hashOtp, hashWithSecret } from '@/lib/auth/hash'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
    }

    const { otp } = await request.json()
    const code = String(otp || '').trim()

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit code' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
    const rl = new RateLimitService(adminClient)
    const limit = await rl.check(`VERIFY:USER:${user.id}`, 10, 900)

    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many verification attempts. Please wait.' }, { status: 429 })
    }

    // Fetch active challenge via Admin Client
    const { data: challenge } = await adminClient
      .from('email_verification_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!challenge) {
      return NextResponse.json({ error: 'No active verification code found. Please click Resend Code.' }, { status: 400 })
    }

    if (new Date(challenge.expires_at) < new Date()) {
      await adminClient.from('email_verification_challenges').update({ status: 'EXPIRED' }).eq('id', challenge.id)
      return NextResponse.json({ error: 'Verification code has expired. Please click Resend Code.' }, { status: 400 })
    }

    if (challenge.attempts >= challenge.max_attempts) {
      await adminClient.from('email_verification_challenges').update({ status: 'LOCKED' }).eq('id', challenge.id)
      return NextResponse.json({ error: 'Too many failed attempts. Please click Resend Code.' }, { status: 429 })
    }

    const inputHash = hashOtp(code)

    if (inputHash !== challenge.code_hash) {
      await adminClient
        .from('email_verification_challenges')
        .update({
          attempts: challenge.attempts + 1,
          status: challenge.attempts + 1 >= challenge.max_attempts ? 'LOCKED' : 'ACTIVE'
        })
        .eq('id', challenge.id)

      await adminClient.from('security_events').insert({
        user_id: user.id,
        event_type: 'EMAIL_VERIFICATION_FAILED',
        success: false,
        ip_hash: hashWithSecret(ip)
      })

      return NextResponse.json({ error: 'Incorrect 6-digit verification code' }, { status: 400 })
    }

    // CONSUME CHALLENGE & UPDATE USER STATE
    await adminClient
      .from('email_verification_challenges')
      .update({ status: 'CONSUMED', consumed_at: new Date().toISOString() })
      .eq('id', challenge.id)

    await adminClient
      .from('users')
      .update({
        account_state: 'USERNAME_REQUIRED',
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Confirm email in auth.users via Admin API
    await adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })

    await adminClient.from('security_events').insert({
      user_id: user.id,
      event_type: 'EMAIL_VERIFIED',
      success: true,
      ip_hash: hashWithSecret(ip)
    })

    return NextResponse.json({ success: true, nextState: 'USERNAME_REQUIRED' })
  } catch (err: any) {
    console.error('[Verify Email API] Fatal Exception:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}