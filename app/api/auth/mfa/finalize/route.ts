import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashWithSecret } from '@/lib/auth/hash'
import crypto from 'crypto'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify they actually enrolled MFA in Supabase Auth safely
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasTotp = Array.isArray(factors?.totp) && factors.totp.length > 0

    if (!hasTotp) {
      return NextResponse.json({ error: 'MFA not enrolled in Auth provider' }, { status: 400 })
    }

    // 1. Generate 10 Single-Use Recovery Codes
    const rawRecoveryCodes: string[] = []
    const recoveryCodeInserts = []

    for (let i = 0; i < 10; i++) {
      const rawCode = `${crypto.randomBytes(3).toString('hex')}-${crypto.randomBytes(3).toString('hex')}`
      rawRecoveryCodes.push(rawCode)
      
      recoveryCodeInserts.push({
        user_id: user.id,
        code_hash: hashWithSecret(rawCode)
      })
    }

    // 2. Overwrite any old codes and insert new hashed ones
    await supabase.from('mfa_recovery_codes').delete().eq('user_id', user.id)
    await supabase.from('mfa_recovery_codes').insert(recoveryCodeInserts)

    // 3. Update 2FA Database State
    await supabase.from('user_2fa').upsert({
      user_id: user.id,
      is_enabled: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // 4. Log Event
    await supabase.from('security_events').insert({
      user_id: user.id,
      event_type: 'MFA_ENABLED',
      success: true
    })

    // Return plain codes exactly ONCE
    return NextResponse.json({ success: true, recoveryCodes: rawRecoveryCodes })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}