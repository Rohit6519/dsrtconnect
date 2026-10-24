import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { EmailDispatchService } from '@/lib/email/EmailDispatchService'
import { RateLimitService } from '@/lib/auth/RateLimitService'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 3 verification requests per hour per user
    const rl = new RateLimitService(adminClient)
    const limit = await rl.check(`VERIFY_REQUEST:USER:${user.id}`, 3, 3600)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Please wait before requesting another verification email' }, { status: 429 })
    }

    const { data: profile } = await adminClient
      .from('users')
      .select('email, full_name, email_verification_status')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (profile.email_verification_status === 'VERIFIED') {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
    }

    // Generate link using 'magiclink' type
    await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email
    })

    // Update state
    await adminClient
      .from('users')
      .update({
        email_verification_status: 'SENT',
        last_verification_email_sent_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Enqueue custom email via dispatch service
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'
    await EmailDispatchService.enqueue({
      userId: user.id,
      recipientEmail: profile.email,
      emailType: 'EMAIL_VERIFICATION',
      subject: '✨ Verify your DSRT email',
      payload: {
        full_name: profile.full_name,
        verification_url: `${appUrl}/settings/security?action=verify`,
        reason: 'user_requested'
      }
    })

    return NextResponse.json({ success: true, message: 'Verification email queued for delivery' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}