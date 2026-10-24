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
    const { data: draft, error } = await supabase
      .from('mail_drafts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const composeState = {
      mode: (draft.compose_mode || 'new') as 'new' | 'reply' | 'reply_all' | 'forward',
      from_identity_id: draft.from_identity_id || undefined,
      to: Array.isArray(draft.to_addresses) ? draft.to_addresses : [],
      cc: Array.isArray(draft.cc_addresses) ? draft.cc_addresses : [],
      bcc: Array.isArray(draft.bcc_addresses) ? draft.bcc_addresses : [],
      subject: draft.subject || '',
      body_html: draft.body_html || '',
      attachments: Array.isArray(draft.attachments) ? draft.attachments : [],
      entity_attachments: Array.isArray(draft.entity_attachments) ? draft.entity_attachments : [],
      reply_to_thread_id: draft.reply_to_thread_id || undefined,
      reply_to_message_id: draft.reply_to_message_id || undefined,
      draft_id: draft.id,
    }

    return NextResponse.json({ draft: composeState })
  } catch (e: any) {
    console.error('Draft detail error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to load draft' }, { status: 500 })
  }
}