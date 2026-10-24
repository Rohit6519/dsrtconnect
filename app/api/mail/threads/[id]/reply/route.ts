import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recordPairwiseInteraction } from '@/lib/mail/security/RelationshipEngine'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { from_identity_id, body_html, mode = 'reply' } = body

    if (!from_identity_id || !body_html?.trim()) {
      return NextResponse.json({ error: 'from_identity_id and body_html required' }, { status: 400 })
    }

    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)
    if (!ownedIds.includes(from_identity_id)) {
      return NextResponse.json({ error: 'Unauthorized identity' }, { status: 403 })
    }

    // Insert message
    const bodyText = body_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const { data: message, error: msgErr } = await supabase
      .from('mail_messages')
      .insert({
        thread_id: threadId,
        sender_identity_id: from_identity_id,
        actual_user_id: user.id,
        body_html,
        body_text: bodyText,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (msgErr) throw msgErr

    // Get all recipient identities in thread to update relationship graph
    const { data: participants } = await supabase
      .from('mail_thread_participants')
      .select('identity_id')
      .eq('thread_id', threadId)
      .neq('identity_id', from_identity_id)

    for (const p of participants || []) {
      void recordPairwiseInteraction(from_identity_id, p.identity_id, true)
    }

    return NextResponse.json({ success: true, message_id: message.id })
  } catch (e: any) {
    console.error('Inline reply error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to reply' }, { status: 500 })
  }
}