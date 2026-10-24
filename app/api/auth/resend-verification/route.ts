import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { EmailService } from '@/lib/email/EmailService'
import { generateSecureOtp6, hashOtp } from '@/lib/auth/hash'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Invalidate old codes
    await adminClient.from('email_verification_challenges')
      .update({ status: 'EXPIRED' })
      .eq('user_id', user.id)

    // 2. Generate new OTP
    const otp = generateSecureOtp6()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: dbError } = await adminClient.from('email_verification_challenges').insert({
      user_id: user.id,
      email: user.email!,
      code_hash: hashOtp(otp),
      expires_at: expiresAt,
      status: 'ACTIVE'
    })

    if (dbError) throw dbError

    // 3. Send Email
    const emailResult = await EmailService.sendVerificationOtp(user.email!, otp)

    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send email' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}