import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const messageBody = (body.body || '').trim()
  const bodyHtml = body.body_html || null

  if (!messageBody || messageBody.length < 1) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Verify thread exists and user is participant
  const { data: thread } = await supabase
    .from('inbox_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!thread.participant_ids.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Determine recipient (the other participant)
  const recipientId = thread.participant_ids.find((id: string) => id !== user.id) || null

  // Insert reply
  const { data: message, error } = await supabase
    .from('inbox_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      message_type: 'reply',
      status: 'unread',
      subject: 'Re: ' + thread.subject,
      body: messageBody.slice(0, 10000),
      body_html: bodyHtml,
      body_preview: messageBody.slice(0, 200),
      reference_type: thread.reference_type,
      reference_id: thread.reference_id,
      reference_name: thread.reference_name,
      reference_slug: thread.reference_slug,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message })
}
