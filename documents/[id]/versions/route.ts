import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMemberResult } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMemberResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: versions, error } = await supabase
      .from('venture_document_versions')
      .select('*, editor:users!edited_by(id, full_name, avatar_url)')
      .eq('document_id', id)
      .eq('venture_id', venture.id)
      .order('version', { ascending: false })

    if (error) throw error

    return NextResponse.json({ versions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMemberResult } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMemberResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { version_id } = body

    const { data: snapshot, error: snapshotErr } = await supabase
      .from('venture_document_versions')
      .select('*')
      .eq('id', version_id)
      .single()

    if (snapshotErr || !snapshot) return NextResponse.json({ error: 'Snapshot version not found' }, { status: 404 })

    const { data: updatedDoc, error: updateErr } = await supabase
      .from('venture_documents')
      .update({
        title: snapshot.title,
        icon: snapshot.icon,
        category: snapshot.category,
        content_blocks: snapshot.content_blocks,
        content_text: snapshot.content_text,
        updated_at: new Date().toISOString(),
        last_edited_by: user.id
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, document: updatedDoc })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}