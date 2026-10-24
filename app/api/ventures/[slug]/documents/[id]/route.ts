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

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: doc, error } = await supabase
      .from('venture_documents')
      .select('*, author:users!created_by(id, full_name, username, avatar_url), editor:users!last_edited_by(id, full_name, username, avatar_url)')
      .eq('id', id)
      .eq('venture_id', venture.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const { data: isMemberResult } = user
      ? await supabase.rpc('is_venture_owner_or_member', {
          p_venture_id: venture.id,
          p_user_id: user.id
        })
      : { data: false }

    if (!isMemberResult && doc.visibility !== 'public') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ document: doc })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
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
    const allowed = [
      'title', 'icon', 'category', 'tags', 'content_blocks',
      'content_html', 'content_text', 'visibility', 'is_pinned',
      'parent_document_id', 'position', 'cover_asset_id'
    ]

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_edited_by: user.id
    }

    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    if (Array.isArray(body.content_blocks)) {
      const textParts = body.content_blocks
        .map((b: any) => b.content || b.title || '')
        .filter(Boolean)
      patch.content_text = [body.title || '', ...textParts].join(' ')
    }

    const { data: before } = await supabase
      .from('venture_documents')
      .select('version, title, icon, category, content_blocks, content_text')
      .eq('id', id)
      .single()

    const nextVersion = before ? (before.version || 1) + 1 : 1
    patch.version = nextVersion

    const { data: doc, error } = await supabase
      .from('venture_documents')
      .update(patch)
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    // Snapshot the OLD state as a historical version (fixed: use upsert with ignoreDuplicates)
    if (before) {
      await supabase
        .from('venture_document_versions')
        .upsert(
          {
            document_id: id,
            venture_id: venture.id,
            version: before.version || 1,
            title: before.title,
            icon: before.icon,
            category: before.category,
            content_blocks: before.content_blocks || [],
            content_text: before.content_text || '',
            edited_by: user.id
          },
          { onConflict: 'document_id,version', ignoreDuplicates: true }
        )
    }

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'document.updated',
        p_target_type: 'document',
        p_target_id: id,
        p_after: doc
      })
    } catch {}

    return NextResponse.json({ success: true, document: doc })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { data: doc, error } = await supabase
      .from('venture_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'document.deleted',
        p_target_type: 'document',
        p_target_id: id,
        p_before: doc
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}