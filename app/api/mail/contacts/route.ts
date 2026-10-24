import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserContactsGraph } from '@/lib/mail/security/RelationshipEngine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', contacts: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const filter = (searchParams.get('type') || 'all') as 'trusted' | 'blocked' | 'all'

  try {
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const myPersonalId = (userIdentities || []).find((i: any) => i.entity_type === 'user')?.identity_id

    if (!myPersonalId) {
      return NextResponse.json({ contacts: [], total: 0 })
    }

    const contacts = await getUserContactsGraph(myPersonalId, filter)

    return NextResponse.json({ contacts, total: contacts.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, contacts: [] }, { status: 500 })
  }
}