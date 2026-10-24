import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { hashPin } from '@/lib/auth/pinHash'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, pin } = await request.json()
    
    // Basic IP extraction for security monitoring (depends on hosting provider)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown'

    if (!email || !pin) {
      return NextResponse.json({ error: 'Email and PIN are required' }, { status: 400 })
    }
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 6 digits' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    const { data: saltData } = await adminClient.rpc('get_pin_salt', {
      p_email: cleanEmail,
    })

    if (!saltData?.has_pin) {
      return NextResponse.json(
        { error: 'PIN not set for this account. Please use password.' },
        { status: 400 }
      )
    }

    const pinHash = hashPin(pin, saltData.salt)

    const { data: verifyResult } = await adminClient.rpc('verify_user_pin_attempt', {
      p_email: cleanEmail,
      p_pin_hash: pinHash,
    })

    const userId = verifyResult?.user_id || null

    // If PIN is invalid or locked
    if (!verifyResult?.success) {
      // Log the failure if we resolved a user ID during the RPC
      if (userId) {
        const isLocked = !!verifyResult?.locked_until
        await adminClient.from('security_events').insert({
          user_id: userId,
          event_type: isLocked ? 'PIN_ACCOUNT_LOCKED' : 'PIN_LOGIN_FAILED',
          success: false,
          ip_address: ip
        })
      }

      return NextResponse.json(
        {
          error: verifyResult?.error || 'Invalid PIN',
          attempts_remaining: verifyResult?.attempts_remaining,
        },
        { status: 401 }
      )
    }

    // Success Path
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
    })

    if (linkError || !linkData.properties?.hashed_token) {
      return NextResponse.json({ error: 'Could not create session' }, { status: 500 })
    }

    // Log successful login
    if (userId) {
      await adminClient.from('security_events').insert({
        user_id: userId,
        event_type: 'PIN_LOGIN_SUCCESS',
        success: true,
        ip_address: ip
      })
    }

    return NextResponse.json({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: cleanEmail,
    })
  } catch (err: any) {
    console.error('[PIN LOGIN]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}