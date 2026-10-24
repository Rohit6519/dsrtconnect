import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST — snooze a thread until a specific ISO datetime
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const snoozeUntil = body?.snooze_until
    if (!snoozeUntil) return NextResponse.json({ error: 'snooze_until required' }, { status: 400 })

    const until = new Date(snoozeUntil)
    if (isNaN(until.getTime()) || until.getTime() <= Date.now() + 60_000) {
      return NextResponse.json({ error: 'snooze_until must be > 1 minute in the future' }, { status: 400 })
    }

    const { data: identities } = await supabase.rpc('fn_get_user_mail_identities', { p_user_id: user.id })
    const ownedIds = (identities || []).map((i: any) => i.identity_id)
    if (!ownedIds.length) return NextResponse.json({ error: 'No mail identity' }, { status: 403 })

    const { error } = await supabase
      .from('mail_thread_participants')
      .update({
        is_snoozed: true,
        snooze_until: until.toISOString(),
        folder: 'inbox',
        is_archived: false,
      })
      .eq('thread_id', id)
      .in('identity_id', ownedIds)

    if (error) throw error

    return NextResponse.json({ success: true, snoozed_until: until.toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// DELETE — unsnooze immediately, restore to inbox
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: identities } = await supabase.rpc('fn_get_user_mail_identities', { p_user_id: user.id })
    const ownedIds = (identities || []).map((i: any) => i.identity_id)
    if (!ownedIds.length) return NextResponse.json({ error: 'No mail identity' }, { status: 403 })

    const { error } = await supabase
      .from('mail_thread_participants')
      .update({
        is_snoozed: false,
        snooze_until: null,
        folder: 'inbox',
      })
      .eq('thread_id', id)
      .in('identity_id', ownedIds)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}