import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get thread
  const { data: thread } = await supabase
    .from('inbox_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  if (!thread.participant_ids.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get all messages in thread
  const { data: messages } = await supabase
    .from('inbox_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  // Get all participants
  const participantIds = thread.participant_ids || []
  const { data: participants } = participantIds.length
    ? await supabase.from('users')
        .select('id, full_name, username, avatar_url, tagline, is_verified, location, bio, website, github_url, linkedin_url')
        .in('id', participantIds)
    : { data: [] }

  // Mark all as read for this user
  await supabase
    .from('inbox_user_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('thread_id', threadId)
    .eq('is_read', false)

  // Also mark old-style status
  await supabase
    .from('inbox_messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .eq('thread_id', threadId)
    .eq('status', 'unread')

  return NextResponse.json({
    thread,
    messages: messages || [],
    participants: participants || [],
  })
}
