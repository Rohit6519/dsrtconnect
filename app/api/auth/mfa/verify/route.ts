import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashWithSecret } from '@/lib/auth/hash'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { factorId, code } = await request.json()

    if (!factorId || !code || code.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit code required' }, { status: 400 })
    }

    // 1. Create Challenge
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) return NextResponse.json({ error: challengeError.message }, { status: 400 })

    // 2. Verify Challenge Code
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code
    })

    if (verifyError) {
      await supabase.from('security_events').insert({
        user_id: user.id,
        event_type: 'MFA_VERIFICATION_FAILED',
        success: false
      })
      return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 })
    }

    // 3. Generate 10 Single-Use Recovery Codes
    const rawRecoveryCodes: string[] = []
    const recoveryCodeInserts = []

    for (let i = 0; i < 10; i++) {
      const rawCode = `${crypto.randomBytes(3).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`
      rawRecoveryCodes.push(rawCode)
      
      const codeHash = hashWithSecret(rawCode)
      recoveryCodeInserts.push({
        user_id: user.id,
        code_hash: codeHash
      })
    }

    // Delete existing codes and store new hashed codes
    await supabase.from('mfa_recovery_codes').delete().eq('user_id', user.id)
    await supabase.from('mfa_recovery_codes').insert(recoveryCodeInserts)

    // 4. Update 2FA Table
    await supabase.from('user_2fa').upsert({
      user_id: user.id,
      is_enabled: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'MFA_ENABLED',
      success: true
    })

    // Return plain recovery codes ONLY ONCE for user download
    return NextResponse.json({
      success: true,
      recoveryCodes: rawRecoveryCodes
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}