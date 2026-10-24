import { adminClient } from '@/lib/supabase/admin'
import { setExplicitTrust } from './RelationshipEngine'

export interface QuarantinedThreadItem {
  thread_id: string
  subject: string
  last_message_at: string
  last_message_preview: string
  sender_email: string
  sender_display_name: string
  classification: string
  delivery_action: string
  decision_reason_code: string
  spam_score: number
  phishing_score: number
  malware_score: number
  scanned_at: string
}

export async function quarantineThread(
  threadId: string,
  recipientIdentityIds: string[]
): Promise<void> {
  if (!threadId || recipientIdentityIds.length === 0) return

  try {
    await adminClient
      .from('mail_thread_participants')
      .update({
        folder: 'quarantine',
        is_read: false,
        is_archived: false,
      })
      .eq('thread_id', threadId)
      .in('identity_id', recipientIdentityIds)
  } catch (e) {
    console.error('[Quarantine Thread Error]', e)
  }
}

export async function getQuarantinedThreadsForUser(
  userOwnedIdentityIds: string[]
): Promise<QuarantinedThreadItem[]> {
  if (!userOwnedIdentityIds || userOwnedIdentityIds.length === 0) return []

  try {
    const { data: participants, error: partErr } = await adminClient
      .from('mail_thread_participants')
      .select('thread_id, identity_id')
      .in('identity_id', userOwnedIdentityIds)
      .eq('folder', 'quarantine')
      .eq('is_trashed', false)

    if (partErr) throw partErr
    if (!participants || participants.length === 0) return []

    const threadIds = Array.from(new Set(participants.map((p) => p.thread_id)))

    const { data: threads } = await adminClient
      .from('mail_threads')
      .select('*')
      .in('id', threadIds)
      .order('last_message_at', { ascending: false })

    if (!threads || threads.length === 0) return []

    const { data: messages } = await adminClient
      .from('mail_messages')
      .select('id, thread_id, sender_identity_id')
      .in('thread_id', threadIds)

    const messageIds = (messages || []).map((m) => m.id)
    const senderIdentityIds = Array.from(new Set((messages || []).map((m) => m.sender_identity_id)))

    const [{ data: secResults }, { data: identities }] = await Promise.all([
      adminClient.from('mail_security_results').select('*').in('message_id', messageIds),
      adminClient.from('mail_identities').select('id, dsrt_email, display_name').in('id', senderIdentityIds),
    ])

    const secMap = Object.fromEntries((secResults || []).map((s) => [s.message_id, s]))
    const identMap = Object.fromEntries((identities || []).map((i) => [i.id, i]))

    return threads.map((t) => {
      const msg = (messages || []).find((m) => m.thread_id === t.id)
      const sec = msg ? secMap[msg.id] : null
      const sender = msg ? identMap[msg.sender_identity_id] : null

      return {
        thread_id: t.id,
        subject: t.subject || '(no subject)',
        last_message_at: t.last_message_at,
        last_message_preview: t.last_message_preview || '',
        sender_email: sender?.dsrt_email || 'unknown@dsrt.com',
        sender_display_name: sender?.display_name || 'External Sender',
        classification: sec?.classification || 'PHISHING',
        delivery_action: sec?.delivery_action || 'QUARANTINE',
        decision_reason_code: sec?.decision_reason_code || 'CONTENT_PHISHING_HEURISTIC',
        spam_score: Number(sec?.spam_score || 0.0),
        phishing_score: Number(sec?.phishing_score || 0.0),
        malware_score: Number(sec?.malware_score || 0.0),
        scanned_at: sec?.scanned_at || t.created_at,
      }
    })
  } catch (e) {
    console.error('[Get Quarantined Threads Error]', e)
    return []
  }
}

export async function releaseQuarantinedThread(
  threadId: string,
  userId: string,
  userIdentityIds: string[],
  trustSender = false
): Promise<void> {
  if (!threadId || userIdentityIds.length === 0) return

  try {
    await adminClient
      .from('mail_thread_participants')
      .update({
        folder: 'inbox',
        is_archived: false,
        is_trashed: false,
      })
      .eq('thread_id', threadId)
      .in('identity_id', userIdentityIds)

    if (trustSender) {
      const { data: msg } = await adminClient
        .from('mail_messages')
        .select('sender_identity_id')
        .eq('thread_id', threadId)
        .limit(1)
        .maybeSingle()

      const recipientId = userIdentityIds[0]
      if (msg?.sender_identity_id && recipientId) {
        await setExplicitTrust(recipientId, msg.sender_identity_id, true)
      }
    }

    await adminClient.from('mail_security_audit').insert({
      actor_user_id: userId,
      action: 'RELEASED_FROM_QUARANTINE',
      details: {
        thread_id: threadId,
        trust_sender_added: trustSender,
        released_at: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.error('[Release Quarantine Error]', e)
    throw e
  }
}