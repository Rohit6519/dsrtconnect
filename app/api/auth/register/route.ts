import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { EmailService } from '@/lib/email/EmailService'
import { RateLimitService } from '@/lib/auth/RateLimitService'
import { generateSecureOtp6, hashOtp, hashWithSecret } from '@/lib/auth/hash'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { email, password, fullName, dob } = await request.json()
    const cleanEmail = String(email || '').trim().toLowerCase()
    const pwd = String(password || '')
    const name = String(fullName || '').trim()

    if (!cleanEmail || !pwd || !name) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (pwd.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // 1. Rate limit check (Bypassed in local development, 15 tokens in production)
    if (process.env.NODE_ENV === 'production') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
      const rl = new RateLimitService(adminClient)
      const ipLimit = await rl.check(`REGISTER:IP:${hashWithSecret(ip)}`, 15, 900)
      if (!ipLimit.allowed) {
        return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
      }
    }

    let userId: string

    // 2. Create User via Admin API (bypasses Supabase default email link)
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: pwd,
      email_confirm: false,
      user_metadata: { full_name: name }
    })

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.status === 422) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pwd
        })

        if (signInError || !signInData.user) {
          return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 })
        }

        userId = signInData.user.id
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }
    } else {
      userId = createData.user.id

      // Establish session for the user on server
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pwd
      })
    }

    // 3. Ensure public.users identity record exists & update details
    await adminClient.from('users').upsert({
      id: userId,
      email: cleanEmail,
      full_name: name,
      dob: dob || null,
      account_state: 'EMAIL_VERIFICATION_REQUIRED',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

    // 4. Invalidate old challenges
    await adminClient.from('email_verification_challenges')
      .update({ status: 'EXPIRED' })
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')

    // 5. Generate 6-digit OTP
    const otp = generateSecureOtp6()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

    const { error: challengeErr } = await adminClient.from('email_verification_challenges').insert({
      user_id: userId,
      email: cleanEmail,
      code_hash: hashOtp(otp),
      expires_at: expiresAt,
      status: 'ACTIVE',
      created_ip_hash: hashWithSecret(ip),
      created_user_agent_hash: hashWithSecret(request.headers.get('user-agent') || 'unknown')
    })

    if (challengeErr) {
      console.error('[Register API] Challenge Insert Error:', challengeErr)
      return NextResponse.json({ error: 'Failed to create verification challenge' }, { status: 500 })
    }

    // 6. Send Email via Resend
    const emailRes = await EmailService.sendVerificationOtp(cleanEmail, otp)

    // 7. Log Security Event
    await adminClient.from('security_events').insert({
      user_id: userId,
      event_type: emailRes.ok ? 'EMAIL_VERIFICATION_SENT' : 'EMAIL_DELIVERY_FAILED',
      success: emailRes.ok,
      metadata: { error: emailRes.error || null, provider: 'resend' }
    })

    return NextResponse.json({ success: true, email: cleanEmail })
  } catch (err: any) {
    console.error('[Register API] Fatal Exception:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}