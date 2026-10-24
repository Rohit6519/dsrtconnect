import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
    const messageBody = (body.body || '').trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : []

    if (!messageBody || messageBody.length < 1) {
      return NextResponse.json({ error: 'Message body required' }, { status: 400 })
    }

    // Fetch the message being replied to
    const { data: parent, error: parentErr } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('id', id)
      .or('recipient_id.eq.' + user.id + ',sender_id.eq.' + user.id)
      .single()

    if (parentErr || !parent) {
      return NextResponse.json({ error: 'Original message not found' }, { status: 404 })
    }

    // Determine recipient: whoever isn't the current user
    const recipientId = parent.sender_id === user.id ? parent.recipient_id : parent.sender_id
    if (!recipientId) {
      return NextResponse.json({ error: 'Cannot determine recipient' }, { status: 400 })
    }

    // Thread ID: use existing thread or create new one rooted at parent
    const threadId = parent.thread_id || parent.id

    // Subject: prepend "Re:" if not already there
    const parentSubject = parent.subject || 'No subject'
    const subject = parentSubject.toLowerCase().startsWith('re:')
      ? parentSubject
      : 'Re: ' + parentSubject

    // Insert reply
    const { data: reply, error } = await supabase
      .from('inbox_messages')
      .insert({
        recipient_id: recipientId,
        sender_id: user.id,
        message_type: parent.message_type || 'connection_request',
        status: 'unread',
        subject: subject.slice(0, 200),
        body: messageBody.slice(0, 10000),
        attachments,
        thread_id: threadId,
        reply_to_id: id,
        reference_type: parent.reference_type,
        reference_id: parent.reference_id,
        reference_name: parent.reference_name,
        reference_slug: parent.reference_slug,
        metadata: parent.metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    // If parent was the original from someone else, update its thread_id to itself so grouping works
    if (!parent.thread_id) {
      await supabase
        .from('inbox_messages')
        .update({ thread_id: parent.id })
        .eq('id', parent.id)
        .then(() => {}, () => {})
    }

    return NextResponse.json({ success: true, message: reply })
  } catch (e: any) {
    console.error('Reply error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}