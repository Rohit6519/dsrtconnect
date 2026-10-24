import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: list drafts
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ drafts: [] })

  const { data } = await supabase
    .from('mail_drafts')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return NextResponse.json({ drafts: data || [] })
}

// POST: create new draft
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('mail_drafts')
      .insert({
        user_id: user.id,
        from_identity_id: body.from_identity_id || null,
        to_addresses: body.to || [],
        cc_addresses: body.cc || [],
        bcc_addresses: body.bcc || [],
        subject: body.subject || '',
        body_html: body.body_html || '',
        attachments: body.attachments || [],
        entity_attachments: body.entity_attachments || [],
        reply_to_thread_id: body.reply_to_thread_id || null,
        reply_to_message_id: body.reply_to_message_id || null,
        compose_mode: body.compose_mode || 'new',
        scheduled_send_at: body.scheduled_send_at || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ draft: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}