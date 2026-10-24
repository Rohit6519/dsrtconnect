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
    const bodyHtml = (body.body_html || body.body || '').trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    if (!bodyHtml) {
      return NextResponse.json({ error: 'Reply message cannot be empty' }, { status: 400 })
    }

    // 1. Resolve the sender's IDENTITY (not just user id)
    const { data: identities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })

    // Prefer personal user identity; fall back to first owned identity
    const senderIdentity =
      identities?.find((i: any) => i.entity_type === 'user') ||
      identities?.[0]

    if (!senderIdentity?.identity_id) {
      return NextResponse.json({ error: 'Sender identity not found' }, { status: 403 })
    }

    // 2. Verify user is a thread participant via identity_id
    const { data: participant } = await supabase
      .from('mail_thread_participants')
      .select('id')
      .eq('thread_id', id)
      .eq('identity_id', senderIdentity.identity_id)
      .maybeSingle()

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 3. Insert message using correct polymorphic columns
    const { data: message, error: msgErr } = await supabase
      .from('mail_messages')
      .insert({
        thread_id: id,
        sender_identity_id: senderIdentity.identity_id,
        actual_user_id: user.id,
        body_html: bodyHtml,
        body_text: bodyHtml.replace(/<[^>]*>/g, ''),
        attachments,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (msgErr) throw msgErr

    return NextResponse.json({ success: true, message })
  } catch (e: any) {
    console.error('Reply Error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}