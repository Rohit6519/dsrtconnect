import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateSalt, hashPin, validatePinFormat } from '@/lib/auth/pinHash'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pin, confirmPin } = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

    if (!pin || !confirmPin) {
      return NextResponse.json({ error: 'Both PIN fields are required' }, { status: 400 })
    }
    if (pin !== confirmPin) {
      return NextResponse.json({ error: 'PINs do not match' }, { status: 400 })
    }

    const validation = validatePinFormat(pin)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const salt = generateSalt()
    const pinHash = hashPin(pin, salt)

    const { error } = await adminClient.rpc('set_user_pin', {
      p_user_id: user.id,
      p_pin_hash: pinHash,
      p_pin_salt: salt,
    })

    if (error) {
      console.error('[PIN SET]', error)
      return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 })
    }

    // Audit log
    await adminClient.from('security_events').insert({
      user_id: user.id,
      event_type: 'PIN_CONFIGURED',
      success: true,
      ip_address: ip
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[PIN SET Exception]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}