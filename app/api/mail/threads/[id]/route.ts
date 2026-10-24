import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Resolve user's identities
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })

    let ownedIdentities = userIdentities || []
    let ownedIds = ownedIdentities.map((i: any) => i.identity_id)

    if (ownedIds.length === 0) {
      const { data: directIdentities } = await supabase
        .from('mail_identities')
        .select('id')
        .eq('entity_type', 'user')
        .eq('entity_id', user.id)

      if (directIdentities && directIdentities.length > 0) {
        ownedIds = directIdentities.map((i) => i.id)
      }
    }

    // 2. Fetch thread
    const { data: thread, error: threadErr } = await supabase
      .from('mail_threads')
      .select('*')
      .eq('id', id)
      .single()

    if (threadErr || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // 3. Mark as read
    if (ownedIds.length > 0) {
      await supabase
        .from('mail_thread_participants')
        .update({ is_read: true, last_read_at: new Date().toISOString() })
        .eq('thread_id', id)
        .in('identity_id', ownedIds)
    }

    // 4. Fetch messages
    const { data: messages } = await supabase
      .from('mail_messages')
      .select('*')
      .eq('thread_id', id)
      .order('sent_at', { ascending: true })

    // 5. Fetch all participants
    const { data: allParticipants } = await supabase
      .from('mail_thread_participants')
      .select('identity_id, role, is_read, last_read_at, folder, is_starred, is_archived, is_trashed, is_snoozed, is_important')
      .eq('thread_id', id)

    // 6. Fetch security results for all messages
    const messageIds = (messages || []).map((m) => m.id)
    let securityMap: Record<string, any> = {}
    if (messageIds.length > 0) {
      const { data: secResults } = await supabase
        .from('mail_security_results')
        .select('*')
        .in('message_id', messageIds)
      securityMap = Object.fromEntries((secResults || []).map((s) => [s.message_id, s]))
    }

    // 7. Gather all involved identities
    const allIdentityIds = Array.from(new Set([
      ...(allParticipants || []).map((p) => p.identity_id),
      ...(messages || []).map((m) => m.sender_identity_id),
    ])).filter(Boolean)

    let identityMap: Record<string, any> = {}
    if (allIdentityIds.length > 0) {
      const { data: idents } = await supabase
        .from('mail_identities')
        .select('*')
        .in('id', allIdentityIds)
      identityMap = Object.fromEntries((idents || []).map((i) => [i.id, i]))
    }

    // 8. Build TO/CC/BCC recipient lists PER thread (all participants except sender)
    const toParticipants = (allParticipants || [])
      .filter((p) => p.role === 'to')
      .map((p) => identityMap[p.identity_id])
      .filter(Boolean)

    const ccParticipants = (allParticipants || [])
      .filter((p) => p.role === 'cc')
      .map((p) => identityMap[p.identity_id])
      .filter(Boolean)

    // 9. Enrich messages with sender + full recipient context
    const enrichedMessages = (messages || []).map((m) => {
      const senderIdent = identityMap[m.sender_identity_id]
      const isSentByMe = ownedIds.includes(m.sender_identity_id)

      return {
        ...m,
        sender_identity: senderIdent || null,
        is_sent_by_me: isSentByMe,
        to_recipients: toParticipants,
        cc_recipients: ccParticipants,
        security_result: securityMap[m.id] || null,
      }
    })

    const enrichedParticipants = (allParticipants || []).map((p) => ({
      ...p,
      identity: identityMap[p.identity_id] || null,
    }))

    const personalIdentity =
      ownedIdentities.find((i: any) => i.entity_type === 'user') ||
      ownedIdentities[0]
    const smartReplyIdentityId: string | null =
      personalIdentity?.identity_id || ownedIds[0] || null

    const myParticipantState =
      (allParticipants || []).find((p) => ownedIds.includes(p.identity_id)) || null

    // Current user's mail identity display info
    const currentUserIdentity = ownedIds.length > 0
      ? identityMap[ownedIds[0]] || personalIdentity
      : null

    return NextResponse.json({
      thread: {
        ...thread,
        participant_state: myParticipantState,
      },
      messages: enrichedMessages,
      participants: enrichedParticipants,
      owned_identity_ids: ownedIds,
      smart_reply_identity_id: smartReplyIdentityId,
      current_user_identity: currentUserIdentity,
      attachments_count: enrichedMessages.reduce(
        (acc, m) => acc + (Array.isArray(m.attachments) ? m.attachments.length : 0),
        0
      ),
    })
  } catch (e: any) {
    console.error('Thread detail error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}