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
    // Get the root message
    const { data: rootMsg, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('id', id)
      .or('recipient_id.eq.' + user.id + ',sender_id.eq.' + user.id)
      .single()

    if (error || !rootMsg) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Fetch entire thread (if part of one)
    const threadId = rootMsg.thread_id || rootMsg.id
    const { data: threadMessages } = await supabase
      .from('inbox_messages')
      .select('*')
      .or('thread_id.eq.' + threadId + ',id.eq.' + threadId)
      .order('created_at', { ascending: true })

    const messages = threadMessages || [rootMsg]

    // Enrich each message with sender info
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id).filter(Boolean)))
    const { data: senders } = await supabase
      .from('users')
      .select('id, full_name, username, avatar_url, is_verified, tagline, location, bio, github_url, linkedin_url, website')
      .in('id', senderIds)
    const senderMap = Object.fromEntries((senders || []).map(s => [s.id, s]))

    const enrichedMessages = messages.map(m => ({
      ...m,
      sender: senderMap[m.sender_id] || null,
    }))

    // Primary sender = original sender of the thread
    const primarySender = senderMap[messages[0].sender_id] || null

    return NextResponse.json({
      message: rootMsg,
      thread: enrichedMessages,
      sender: primarySender,
      threadId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

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
    if (body.status && ['unread', 'read', 'archived'].includes(body.status)) updates.status = body.status
    if (body.status === 'read') updates.read_at = new Date().toISOString()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('inbox_messages')
      .update(updates)
      .eq('id', id)
      .eq('recipient_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true, updates })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { error } = await supabase
      .from('inbox_messages')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('recipient_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}