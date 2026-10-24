import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { releaseQuarantinedThread } from '@/lib/mail/security/QuarantineManager'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const trustSender = Boolean(body.trust_sender)

    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)

    if (ownedIds.length === 0) {
      return NextResponse.json({ error: 'No mail identity' }, { status: 403 })
    }

    await releaseQuarantinedThread(threadId, user.id, ownedIds, trustSender)

    return NextResponse.json({ success: true, thread_id: threadId, released: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to release thread' }, { status: 500 })
  }
}