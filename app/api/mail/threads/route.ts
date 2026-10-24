import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized', threads: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const identityId = searchParams.get('identity_id')
  const folder = searchParams.get('folder') || 'inbox'
  const tab = searchParams.get('tab')
  const searchQ = (searchParams.get('q') || '').trim()
  const hasAttachment = searchParams.get('has_attachment') === '1'
  const unreadOnly = searchParams.get('unread_only') === '1'
  const starredOnly = searchParams.get('starred_only') === '1'
  const fromType = searchParams.get('from_type')
  const dateRange = searchParams.get('date_range')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    // Get user's identities
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', { 
      p_user_id: user.id 
    })
    if (!userIdentities || userIdentities.length === 0) {
      return NextResponse.json({ threads: [], total: 0 })
    }
    const allOwnedIds: string[] = userIdentities.map((i: any) => i.identity_id)

    let targetIdentityIds: string[]
    if (!identityId || identityId === 'unified') {
      targetIdentityIds = allOwnedIds
    } else {
      if (!allOwnedIds.includes(identityId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      targetIdentityIds = [identityId]
    }

    // ─── DRAFTS FOLDER ───
    if (folder === 'drafts') {
      const { data: drafts, count } = await supabase
        .from('mail_drafts')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .is('scheduled_send_at', null)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const threadsFromDrafts = (drafts || []).map(d => ({
        id: d.id,
        subject: d.subject || '(no subject)',
        last_message_at: d.updated_at,
        last_message_preview: (d.body_html || '').replace(/<[^>]*>/g, '').slice(0, 160),
        message_count: 1,
        source_type: 'draft',
        is_draft: true,
        has_attachments: Array.isArray(d.attachments) && d.attachments.length > 0,
        participant_state: { is_read: true, is_starred: false },
        last_sender_identity: userIdentities.find((i: any) => i.identity_id === d.from_identity_id) || userIdentities[0],
      }))
      return NextResponse.json({ threads: threadsFromDrafts, total: count || 0 })
    }

    // ─── SCHEDULED FOLDER ───
    if (folder === 'scheduled') {
      const { data: scheduled, count } = await supabase
        .from('mail_drafts')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .not('scheduled_send_at', 'is', null)
        .order('scheduled_send_at', { ascending: true })
        .range(offset, offset + limit - 1)

      const threadsFromScheduled = (scheduled || []).map(d => ({
        id: d.id,
        subject: d.subject || '(no subject)',
        last_message_at: d.scheduled_send_at,
        last_message_preview: `Scheduled for ${new Date(d.scheduled_send_at).toLocaleString()}`,
        message_count: 1,
        source_type: 'scheduled',
        is_scheduled: true,
        participant_state: { is_read: true },
        last_sender_identity: userIdentities.find((i: any) => i.identity_id === d.from_identity_id) || userIdentities[0],
      }))
      return NextResponse.json({ threads: threadsFromScheduled, total: count || 0 })
    }

    // ─── PARTICIPANTS QUERY ───
    let partQuery = supabase
      .from('mail_thread_participants')
      .select('thread_id, identity_id, is_read, is_starred, is_archived, is_trashed, folder, role, is_snoozed, snooze_until, is_spam, is_important')
      .in('identity_id', targetIdentityIds)

    // Folder-specific filters
    switch (folder) {
      case 'inbox':
        partQuery = partQuery
          .eq('folder', 'inbox')
          .eq('is_trashed', false)
          .eq('is_archived', false)
          .eq('is_spam', false)
          .eq('is_snoozed', false)
        break
      case 'archive':
        partQuery = partQuery
          .eq('is_archived', true)
          .eq('is_trashed', false)
          .eq('is_spam', false)
        break
      case 'starred':
        partQuery = partQuery.eq('is_starred', true).eq('is_trashed', false)
        break
      case 'snoozed':
        partQuery = partQuery.eq('is_snoozed', true).eq('is_trashed', false)
        break
      case 'sent':
        partQuery = partQuery.eq('role', 'from').eq('is_trashed', false)
        break
      case 'all':
        partQuery = partQuery.eq('is_trashed', false).eq('is_spam', false)
        break
      case 'spam':
        partQuery = partQuery.eq('is_spam', true).eq('is_trashed', false)
        break
      case 'trash':
        partQuery = partQuery.eq('is_trashed', true)
        break
      case 'important':
        partQuery = partQuery.eq('is_important', true).eq('is_trashed', false)
        break
      case 'action_required':
        partQuery = partQuery.eq('folder', 'inbox').eq('is_trashed', false)
        break
      case 'awaiting_reply':
        partQuery = partQuery.eq('role', 'from').eq('is_trashed', false)
        break
      case 'unread':
        partQuery = partQuery.eq('is_read', false).eq('is_trashed', false).eq('is_spam', false)
        break
      case 'with_attachments':
      case 'shared_with_me':
        partQuery = partQuery.eq('is_trashed', false)
        if (folder === 'shared_with_me') partQuery = partQuery.neq('role', 'from')
        break
    }

    // Chip filters
    if (unreadOnly) partQuery = partQuery.eq('is_read', false)
    if (starredOnly) partQuery = partQuery.eq('is_starred', true)

    const { data: participants, error: partErr } = await partQuery
    if (partErr) throw partErr
    if (!participants || participants.length === 0) {
      return NextResponse.json({ threads: [], total: 0 })
    }

    // Deduplicate — one entry per thread
    const partMap = new Map<string, any>()
    participants.forEach(p => {
      const existing = partMap.get(p.thread_id)
      if (!existing || (!p.is_read && existing.is_read)) partMap.set(p.thread_id, p)
    })
    let uniqueThreadIds = Array.from(partMap.keys())

    // ─── FULL-TEXT SEARCH — search subject, body, sender name, dsrt_email ───
    if (searchQ.length >= 2) {
      const searchLower = searchQ.toLowerCase()

      // Search across message body_text
      const { data: msgMatches } = await supabase
        .from('mail_messages')
        .select('thread_id')
        .in('thread_id', uniqueThreadIds)
        .ilike('body_text', `%${searchLower}%`)
        .limit(500)

      const threadsFromBody = new Set((msgMatches || []).map(m => m.thread_id))

      // Search across sender identities (display_name or dsrt_email)
      const { data: senderMatches } = await supabase
        .from('mail_identities')
        .select('id, display_name, dsrt_email')
        .or(`display_name.ilike.%${searchLower}%,dsrt_email.ilike.%${searchLower}%`)
        .limit(50)

      const senderIds = (senderMatches || []).map(s => s.id)
      let threadsFromSenders = new Set<string>()
      if (senderIds.length > 0) {
        const { data: msgs } = await supabase
          .from('mail_messages')
          .select('thread_id')
          .in('sender_identity_id', senderIds)
          .in('thread_id', uniqueThreadIds)
          .limit(500)
        threadsFromSenders = new Set((msgs || []).map(m => m.thread_id))
      }

      // Search subject
      const { data: subjectMatches } = await supabase
        .from('mail_threads')
        .select('id')
        .in('id', uniqueThreadIds)
        .ilike('subject', `%${searchLower}%`)
        .limit(500)

      const threadsFromSubject = new Set((subjectMatches || []).map(t => t.id))

      // Union: threads matching ANY of the above
      const matchingIds = new Set([
        ...Array.from(threadsFromBody),
        ...Array.from(threadsFromSenders),
        ...Array.from(threadsFromSubject),
      ])

      uniqueThreadIds = uniqueThreadIds.filter(id => matchingIds.has(id))

      if (uniqueThreadIds.length === 0) {
        return NextResponse.json({ threads: [], total: 0 })
      }
    }

    // ─── FETCH THREADS ───
    let threadQuery = supabase
      .from('mail_threads')
      .select('*', { count: 'exact' })
      .in('id', uniqueThreadIds)
      .order('last_message_at', { ascending: false })

    // Action required — must have unresolved action
    if (folder === 'action_required') {
      threadQuery = threadQuery
        .in('source_type', ['connect', 'application', 'venture_invite', 'project_invite'])
        .is('action_state', null)
    }

    // Awaiting reply — last message is from me
    if (folder === 'awaiting_reply') {
      // Handled by role='from' in participants; further filter below
    }

    // Tab filtering
    if (tab === 'projects') {
      threadQuery = threadQuery.or('source_entity_type.eq.project,source_type.eq.project_invite')
    } else if (tab === 'ventures') {
      threadQuery = threadQuery.or('source_entity_type.eq.venture,source_type.eq.venture_invite')
    } else if (tab === 'network') {
      threadQuery = threadQuery.in('source_type', ['connect', 'application'])
    } else if (tab === 'personal') {
      threadQuery = threadQuery.or('source_type.eq.direct,source_type.eq.system,source_entity_type.is.null')
    }

    // Date range
    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      let cutoff: Date | null = null
      if (dateRange === 'today') { cutoff = new Date(); cutoff.setHours(0, 0, 0, 0) }
      else if (dateRange === 'week') { cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7) }
      else if (dateRange === 'month') { cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 1) }
      if (cutoff) threadQuery = threadQuery.gte('last_message_at', cutoff.toISOString())
    }

    // has_attachment filter
    if (hasAttachment || folder === 'with_attachments') {
      threadQuery = threadQuery.eq('has_attachments', true)
    }

    const { data: threads, error: threadErr, count } = await threadQuery.range(offset, offset + limit - 1)
    if (threadErr) throw threadErr

    // ─── ENRICH ───
    const senderIdentityIds = Array.from(new Set(
      (threads || []).map(t => t.last_message_sender_identity_id).filter(Boolean)
    ))
    const receivingIdentityIds = Array.from(new Set(
      (threads || []).map(t => partMap.get(t.id)?.identity_id).filter(Boolean)
    ))
    const allIdsToFetch = Array.from(new Set([...senderIdentityIds, ...receivingIdentityIds]))

    let identityMap: Record<string, any> = {}
    if (allIdsToFetch.length > 0) {
      const { data: idents } = await supabase
        .from('mail_identities')
        .select('id, entity_type, entity_id, dsrt_email, display_name, avatar_url')
        .in('id', allIdsToFetch)
      identityMap = Object.fromEntries((idents || []).map(i => [i.id, i]))
    }

    let enriched = (threads || []).map(t => {
      const partState = partMap.get(t.id)
      return {
        ...t,
        participant_state: partState,
        last_sender_identity: identityMap[t.last_message_sender_identity_id] || null,
        receiving_identity: identityMap[partState?.identity_id] || null,
      }
    })

    // Client-side: from_type filter
    if (fromType && fromType !== 'all') {
      enriched = enriched.filter(t => t.last_sender_identity?.entity_type === fromType)
    }

    return NextResponse.json({ 
      threads: enriched, 
      total: count || enriched.length,
      folder,
      offset,
      limit,
    })
  } catch (e: any) {
    console.error('Mail threads list error:', e)
    return NextResponse.json({ error: e?.message, threads: [] }, { status: 500 })
  }
}