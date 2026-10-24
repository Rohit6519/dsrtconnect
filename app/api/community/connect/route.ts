import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipient_id, message } = await request.json()
  if (!recipient_id) return NextResponse.json({ error: 'Missing recipient_id' }, { status: 400 })
  if (recipient_id === user.id) return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })

  // Create connection
  const { data: connection, error } = await supabase
    .from('builder_connections')
    .insert({
      requester_id: user.id,
      recipient_id,
      message: message || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Connection already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get requester info
  const { data: requester } = await supabase
    .from('users')
    .select('full_name, username, avatar_url')
    .eq('id', user.id)
    .single()

  // Create notification
  await supabase.from('notifications').insert({
    user_id: recipient_id,
    type: 'connection_request',
    title: `${requester?.full_name || 'Someone'} wants to connect`,
    body: message || `${requester?.full_name || 'A builder'} sent you a connection request.`,
    actor_id: user.id,
    entity_type: 'connection',
    entity_id: connection.id,
    link: `/profile/${requester?.username || ''}`,
  })

  return NextResponse.json({ success: true, connection })
}