import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { thread_ids, updates } = body || {}

    if (!Array.isArray(thread_ids) || thread_ids.length === 0) {
      return NextResponse.json({ error: 'thread_ids required' }, { status: 400 })
    }
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates required' }, { status: 400 })
    }

    const normalized: Record<string, any> = {}

    if (typeof updates.is_starred === 'boolean') normalized.is_starred = updates.is_starred

    if (typeof updates.is_archived === 'boolean') {
      normalized.is_archived = updates.is_archived
      if (updates.is_archived) {
        normalized.folder = 'archive'
        normalized.is_snoozed = false
        normalized.snooze_until = null
      } else if (!updates.folder) {
        normalized.folder = 'inbox'
      }
    }

    if (typeof updates.is_trashed === 'boolean') {
      normalized.is_trashed = updates.is_trashed
      if (updates.is_trashed) {
        normalized.folder = 'trash'
        normalized.is_snoozed = false
        normalized.snooze_until = null
      }
    }

    if (typeof updates.is_read === 'boolean') {
      normalized.is_read = updates.is_read
      if (updates.is_read) normalized.last_read_at = new Date().toISOString()
    }

    if (typeof updates.is_spam === 'boolean') normalized.is_spam = updates.is_spam
    if (typeof updates.is_important === 'boolean') normalized.is_important = updates.is_important

    if (updates.snooze_until !== undefined) {
      normalized.snooze_until = updates.snooze_until
      if (updates.snooze_until) {
        normalized.is_snoozed = true
        normalized.folder = 'inbox'
        normalized.is_archived = false
      }
    }

    if (typeof updates.is_snoozed === 'boolean') {
      normalized.is_snoozed = updates.is_snoozed
      if (!updates.is_snoozed) {
        normalized.snooze_until = null
        if (!updates.folder) normalized.folder = 'inbox'
      }
    }

    if (updates.folder) normalized.folder = updates.folder

    if (Object.keys(normalized).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
    }

    const { data: identities } = await supabase.rpc('fn_get_user_mail_identities', { p_user_id: user.id })
    const ownedIds = (identities || []).map((i: any) => i.identity_id)
    if (!ownedIds.length) return NextResponse.json({ error: 'No mail identity' }, { status: 403 })

    const { error } = await supabase
      .from('mail_thread_participants')
      .update(normalized)
      .in('thread_id', thread_ids)
      .in('identity_id', ownedIds)

    if (error) throw error

    return NextResponse.json({ success: true, updated: thread_ids.length })
  } catch (e: any) {
    console.error('Bulk update error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}