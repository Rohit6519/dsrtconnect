import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', messages: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const folder = searchParams.get('folder') || 'all'
  const searchQ = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    let query = supabase
      .from('inbox_messages')
      .select('id, sender_id, recipient_id, message_type, status, subject, body, body_preview, thread_id, is_starred, reference_type, reference_id, reference_name, reference_slug, attachments, created_at, read_at, responded_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    // ─── Folder filter ───
    switch (folder) {
      case 'unread':
        query = query.eq('recipient_id', user.id).eq('status', 'unread')
        break
      case 'starred':
        query = query.eq('recipient_id', user.id).eq('is_starred', true)
        break
      case 'sent':
        query = query.eq('sender_id', user.id)
        break
      case 'applications':
        query = query.eq('recipient_id', user.id).in('message_type', ['role_application', 'looking_for_application'])
        break
      case 'connections':
        query = query.eq('recipient_id', user.id).in('message_type', ['connection_request', 'venture_connection', 'collaboration_request'])
        break
      case 'notifications':
        query = query.eq('recipient_id', user.id).in('message_type', ['dsrt_official', 'system'])
        break
      case 'archived':
        // Special case: show archived
        query = supabase
          .from('inbox_messages')
          .select('id, sender_id, recipient_id, message_type, status, subject, body, body_preview, thread_id, is_starred, reference_type, reference_id, reference_name, reference_slug, attachments, created_at, read_at, responded_at')
          .eq('recipient_id', user.id)
          .eq('status', 'archived')
          .order('created_at', { ascending: false })
        break
      case 'all':
      default:
        query = query.or('recipient_id.eq.' + user.id + ',sender_id.eq.' + user.id)
        break
    }

    // ─── Search ───
    if (searchQ && searchQ.length >= 2) {
      query = query.or(
        'subject.ilike.%' + searchQ + '%,' +
        'body.ilike.%' + searchQ + '%'
      )
    }

    const { data: messages, error } = await query.range(offset, offset + limit - 1)
    if (error) throw error

    // ─── Enrich with sender info ───
    const senderIds = Array.from(new Set((messages || []).map(m => m.sender_id).filter(Boolean)))
    let senderMap: Record<string, any> = {}
    if (senderIds.length > 0) {
      const { data: senders } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, is_verified')
        .in('id', senderIds)
      senderMap = Object.fromEntries((senders || []).map(s => [s.id, s]))
    }

    // ─── Group by thread (Gmail-style) ───
    // Return the LATEST message per thread, with reply_count
    const threadMap = new Map<string, any>()
    for (const m of messages || []) {
      const key = m.thread_id || m.id
      const existing = threadMap.get(key)
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        threadMap.set(key, {
          ...m,
          sender: senderMap[m.sender_id] || null,
          reply_count: (existing?.reply_count || 0) + 1,
        })
      } else {
        existing.reply_count = (existing.reply_count || 1) + 1
      }
    }

    const grouped = Array.from(threadMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      messages: grouped,
      folder,
      pagination: {
        limit,
        offset,
        count: grouped.length,
        hasMore: (messages || []).length >= limit,
      },
    })
  } catch (e: any) {
    console.error('Inbox list error:', e)
    return NextResponse.json({ error: e?.message, messages: [] }, { status: 500 })
  }
}