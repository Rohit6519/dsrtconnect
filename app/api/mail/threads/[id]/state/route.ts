import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const updates: Record<string, any> = {}

    if (typeof body.is_starred === 'boolean') updates.is_starred = body.is_starred
    if (typeof body.is_archived === 'boolean') {
      updates.is_archived = body.is_archived
      if (body.is_archived === true) {
        updates.folder = 'archive'
        updates.is_snoozed = false
        updates.snooze_until = null
      } else if (body.is_archived === false && body.folder === undefined) {
        updates.folder = 'inbox'
      }
    }
    if (typeof body.is_trashed === 'boolean') {
      updates.is_trashed = body.is_trashed
      if (body.is_trashed === true) {
        updates.folder = 'trash'
        updates.is_snoozed = false
        updates.snooze_until = null
      }
    }
    if (typeof body.is_read === 'boolean') {
      updates.is_read = body.is_read
      if (body.is_read === true) updates.last_read_at = new Date().toISOString()
    }
    if (typeof body.is_spam === 'boolean') updates.is_spam = body.is_spam
    if (typeof body.is_important === 'boolean') updates.is_important = body.is_important
    if (typeof body.is_snoozed === 'boolean') {
      updates.is_snoozed = body.is_snoozed
      if (body.is_snoozed === false) {
        updates.snooze_until = null
        if (!body.folder) updates.folder = 'inbox'
      }
    }
    if (body.snooze_until !== undefined) {
      updates.snooze_until = body.snooze_until
      if (body.snooze_until) {
        updates.is_snoozed = true
        updates.folder = 'inbox'
      }
    }
    if (body.folder) updates.folder = body.folder

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
    }

    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)
    if (!ownedIds.length) {
      return NextResponse.json({ error: 'No mail identity' }, { status: 403 })
    }

    const { error } = await supabase
      .from('mail_thread_participants')
      .update(updates)
      .eq('thread_id', id)
      .in('identity_id', ownedIds)

    if (error) throw error

    return NextResponse.json({ success: true, updates })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}