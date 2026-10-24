import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH: autosave draft
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
    const updates: any = { updated_at: new Date().toISOString() }
    if ('from_identity_id' in body) updates.from_identity_id = body.from_identity_id
    if ('to' in body) updates.to_addresses = body.to
    if ('cc' in body) updates.cc_addresses = body.cc
    if ('bcc' in body) updates.bcc_addresses = body.bcc
    if ('subject' in body) updates.subject = body.subject
    if ('body_html' in body) updates.body_html = body.body_html
    if ('attachments' in body) updates.attachments = body.attachments
    if ('entity_attachments' in body) updates.entity_attachments = body.entity_attachments
    if ('scheduled_send_at' in body) updates.scheduled_send_at = body.scheduled_send_at

    const { error } = await supabase
      .from('mail_drafts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// DELETE: discard draft
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('mail_drafts').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}