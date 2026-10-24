import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getQuarantinedThreadsForUser } from '@/lib/mail/security/QuarantineManager'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', items: [] }, { status: 401 })

  try {
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)

    if (ownedIds.length === 0) {
      return NextResponse.json({ items: [], total: 0 })
    }

    const items = await getQuarantinedThreadsForUser(ownedIds)

    return NextResponse.json({ items, total: items.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, items: [] }, { status: 500 })
  }
}