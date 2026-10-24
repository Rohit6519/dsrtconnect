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

    const { currentPin, newPin, confirmPin } = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

    if (!currentPin || !newPin || !confirmPin) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (newPin !== confirmPin) {
      return NextResponse.json({ error: 'New PINs do not match' }, { status: 400 })
    }

    const validation = validatePinFormat(newPin)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { data: userPin } = await adminClient
      .from('user_pins')
      .select('pin_hash, pin_salt')
      .eq('user_id', user.id)
      .single()

    if (!userPin) {
      return NextResponse.json({ error: 'No PIN found for this account' }, { status: 400 })
    }

    const currentHash = hashPin(currentPin, userPin.pin_salt)
    if (currentHash !== userPin.pin_hash) {
      // Audit log failed attempt to change PIN
      await adminClient.from('security_events').insert({
        user_id: user.id,
        event_type: 'PIN_CHANGE_FAILED',
        success: false,
        ip_address: ip
      })
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 })
    }

    const newSalt = generateSalt()
    const newHash = hashPin(newPin, newSalt)

    const { error } = await adminClient.rpc('set_user_pin', {
      p_user_id: user.id,
      p_pin_hash: newHash,
      p_pin_salt: newSalt,
    })

    if (error) throw error

    // Audit log successful PIN rotation
    await adminClient.from('security_events').insert({
      user_id: user.id,
      event_type: 'PIN_CHANGED',
      success: true,
      ip_address: ip
    })

    return NextResponse.json({ success: true, message: 'PIN updated successfully' })
  } catch (err: any) {
    console.error('[PIN CHANGE]', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}