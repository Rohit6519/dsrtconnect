import { adminClient } from '@/lib/supabase/admin'

export interface SnoozeRecord {
  id: string
  user_id: string
  thread_id: string
  identity_id: string
  snoozed_at: string
  wake_at_utc: string
  timezone: string
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED'
  created_at: string
}

export interface CreateSnoozeParams {
  userId: string
  threadId: string
  identityId: string
  wakeAtUtc: Date
  timezone?: string
}

export async function createSnooze(params: CreateSnoozeParams): Promise<SnoozeRecord> {
  const { userId, threadId, identityId, wakeAtUtc, timezone = 'UTC' } = params

  try {
    await adminClient
      .from('mail_snoozes')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')

    const { data: snooze, error: snoozeErr } = await adminClient
      .from('mail_snoozes')
      .insert({
        user_id: userId,
        thread_id: threadId,
        identity_id: identityId,
        snoozed_at: new Date().toISOString(),
        wake_at_utc: wakeAtUtc.toISOString(),
        timezone,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (snoozeErr) throw snoozeErr

    await adminClient
      .from('mail_thread_participants')
      .update({
        is_snoozed: true,
        snooze_until: wakeAtUtc.toISOString(),
        folder: 'inbox',
        is_archived: false,
      })
      .eq('thread_id', threadId)
      .eq('identity_id', identityId)

    return snooze
  } catch (e) {
    console.error('[Create Snooze Error]', e)
    throw e
  }
}

export async function cancelSnooze(snoozeIdOrThreadId: string, userId: string): Promise<void> {
  try {
    const { data: activeSnooze } = await adminClient
      .from('mail_snoozes')
      .select('id, thread_id, identity_id')
      .or(`id.eq.${snoozeIdOrThreadId},thread_id.eq.${snoozeIdOrThreadId}`)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle()

    if (activeSnooze) {
      await adminClient
        .from('mail_snoozes')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', activeSnooze.id)

      await adminClient
        .from('mail_thread_participants')
        .update({
          is_snoozed: false,
          snooze_until: null,
          folder: 'inbox',
        })
        .eq('thread_id', activeSnooze.thread_id)
        .eq('identity_id', activeSnooze.identity_id)
    }
  } catch (e) {
    console.error('[Cancel Snooze Error]', e)
    throw e
  }
}

export async function cancelSnoozeOnIncomingReply(threadId: string): Promise<void> {
  try {
    await adminClient
      .from('mail_snoozes')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('status', 'ACTIVE')

    await adminClient
      .from('mail_thread_participants')
      .update({
        is_snoozed: false,
        snooze_until: null,
        is_read: false,
        folder: 'inbox',
      })
      .eq('thread_id', threadId)
      .eq('is_snoozed', true)
  } catch (e) {
    console.error('[Auto Wake On Reply Error]', e)
  }
}

export async function wakeDueSnoozes(): Promise<number> {
  try {
    const nowIso = new Date().toISOString()

    const { data: dueSnoozes, error: fetchErr } = await adminClient
      .from('mail_snoozes')
      .select('id, thread_id, identity_id')
      .eq('status', 'ACTIVE')
      .lte('wake_at_utc', nowIso)

    if (fetchErr || !dueSnoozes || dueSnoozes.length === 0) {
      try {
        const { data: legacyCount } = await adminClient.rpc('fn_restore_snoozed_threads')
        return legacyCount || 0
      } catch {
        return 0
      }
    }

    const snoozeIds = dueSnoozes.map((s) => s.id)

    await adminClient
      .from('mail_snoozes')
      .update({ status: 'TRIGGERED', updated_at: nowIso })
      .in('id', snoozeIds)

    for (const s of dueSnoozes) {
      await adminClient
        .from('mail_thread_participants')
        .update({
          is_snoozed: false,
          snooze_until: null,
          folder: 'inbox',
          is_read: false,
        })
        .eq('thread_id', s.thread_id)
        .eq('identity_id', s.identity_id)
    }

    return dueSnoozes.length
  } catch (e) {
    console.error('[Wake Due Snoozes Error]', e)
    return 0
  }
}

export async function listUserSnoozes(userId: string): Promise<SnoozeRecord[]> {
  try {
    const { data, error } = await adminClient
      .from('mail_snoozes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('wake_at_utc', { ascending: true })

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('[List User Snoozes Error]', e)
    return []
  }
}