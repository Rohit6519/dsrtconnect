import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('encrypted_docs')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'view_encrypted_doc',
    p_resource_type: 'encrypted_doc',
    p_resource_id: id,
  })

  return NextResponse.json({ doc: data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, encrypted_content, iv } = await request.json()

  const updates: any = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (encrypted_content !== undefined) updates.encrypted_content = encrypted_content
  if (iv !== undefined) updates.iv = iv

  const { data, error } = await supabase
    .from('encrypted_docs')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ doc: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('encrypted_docs')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'delete_encrypted_doc',
    p_resource_type: 'encrypted_doc',
    p_resource_id: id,
  })

  return NextResponse.json({ success: true })
}