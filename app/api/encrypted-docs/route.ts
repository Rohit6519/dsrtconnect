import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('encrypted_docs')
    .select('id, title, is_personal, project_id, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log audit
  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'list_encrypted_docs',
    p_metadata: { count: data?.length || 0 },
  })

  return NextResponse.json({ docs: data || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, encrypted_content, iv, project_id, is_personal = true } = await request.json()

  if (!title || !encrypted_content || !iv) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('encrypted_docs')
    .insert({
      owner_id: user.id,
      title,
      encrypted_content,
      iv,
      project_id: project_id || null,
      is_personal,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'create_encrypted_doc',
    p_resource_type: 'encrypted_doc',
    p_resource_id: data.id,
  })

  return NextResponse.json({ doc: data })
}