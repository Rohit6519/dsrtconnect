import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { listUserSnoozes, createSnooze } from '@/lib/mail/security/SnoozeEngine'

export const dynamic = 'force-dynamic'

// GET: list all active snoozes for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', snoozes: [] }, { status: 401 })

  try {
    const snoozes = await listUserSnoozes(user.id)
    return NextResponse.json({ snoozes, total: snoozes.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, snoozes: [] }, { status: 500 })
  }
}

// POST: create a new snooze record
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { thread_id, identity_id, wake_at_utc, timezone = 'UTC' } = body

    if (!thread_id || !wake_at_utc) {
      return NextResponse.json({ error: 'thread_id and wake_at_utc required' }, { status: 400 })
    }

    const wakeDate = new Date(wake_at_utc)
    if (isNaN(wakeDate.getTime()) || wakeDate.getTime() <= Date.now() + 30_000) {
      return NextResponse.json({ error: 'wake_at_utc must be in the future' }, { status: 400 })
    }

    // Resolve target identity ID
    let targetIdentityId = identity_id
    if (!targetIdentityId) {
      const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
        p_user_id: user.id,
      })
      targetIdentityId = (userIdentities || []).find((i: any) => i.entity_type === 'user')?.identity_id
    }

    if (!targetIdentityId) {
      return NextResponse.json({ error: 'Target identity not found' }, { status: 403 })
    }

    const snooze = await createSnooze({
      userId: user.id,
      threadId: thread_id,
      identityId: targetIdentityId,
      wakeAtUtc: wakeDate,
      timezone,
    })

    return NextResponse.json({ success: true, snooze })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create snooze' }, { status: 500 })
  }
}