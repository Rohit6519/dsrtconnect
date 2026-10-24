import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { recipientId, subject, message_html, attachments } = await request.json()

    if (!recipientId || (!message_html && (!attachments || attachments.length === 0))) {
      return NextResponse.json({ error: 'Recipient and message required' }, { status: 400 })
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })
    }

    // 1. Get sender DSRT email
    const { data: senderProfile } = await supabase
      .from('users')
      .select('username, dsrt_email, full_name')
      .eq('id', user.id)
      .single()

    const senderEmail = senderProfile?.dsrt_email || `${senderProfile?.username || 'user'}@dsrt.com`
    const senderName = senderProfile?.full_name || `@${senderProfile?.username}`

    // 2. Send via Mail V2 RPC
    const mailSubject = subject?.trim() || `Connection Request from ${senderName}`
    
    await supabase.rpc('fn_send_dsrt_mail', {
      p_sender_id: user.id,
      p_sender_email: senderEmail,
      p_recipient_ids: [recipientId],
      p_subject: mailSubject.slice(0, 250),
      p_body_html: message_html || `<p>Hi! I'd like to connect with you on DSRT.</p>`,
      p_source_type: 'connect',
      p_source_entity_type: 'user',
      p_source_entity_id: user.id,
      p_attachments: Array.isArray(attachments) ? attachments : [],
    })

    // 3. Upsert builder_connections record as pending
    await supabase
      .from('builder_connections')
      .upsert({
        requester_id: user.id,
        recipient_id: recipientId,
        status: 'pending',
      }, { onConflict: 'requester_id, recipient_id' })
      .then(() => {}, () => {})

    // 4. Track signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'connect_sent',
      entity_type: 'user',
      entity_id: recipientId,
      weight: 10,
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, success: true })
  } catch (e: any) {
    console.error('Profile connect error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}