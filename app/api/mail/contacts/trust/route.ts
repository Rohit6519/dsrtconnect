import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { setExplicitTrust } from '@/lib/mail/security/RelationshipEngine'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { target_identity_id, trusted = true } = body

    if (!target_identity_id) {
      return NextResponse.json({ error: 'target_identity_id required' }, { status: 400 })
    }

    // Get user's primary identity
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const myPersonalId = (userIdentities || []).find((i: any) => i.entity_type === 'user')?.identity_id

    if (!myPersonalId) {
      return NextResponse.json({ error: 'No personal mail identity found' }, { status: 403 })
    }

    await setExplicitTrust(myPersonalId, target_identity_id, Boolean(trusted))

    return NextResponse.json({ success: true, trusted: Boolean(trusted) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update trust' }, { status: 500 })
  }
}