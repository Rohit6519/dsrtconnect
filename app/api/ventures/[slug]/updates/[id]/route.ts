import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: update, error } = await supabase
      .from('venture_updates')
      .select('*, author:users!created_by(id, full_name, username, avatar_url)')
      .eq('id', id)
      .eq('venture_id', venture.id)
      .is('deleted_at', null)
      .single()

    if (error || !update) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    supabase
      .from('venture_updates')
      .update({ view_count: (update.view_count || 0) + 1 })
      .eq('id', id)
      .then(() => {}, () => {})

    return NextResponse.json({ update })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
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
    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const allowedFields = [
      'title', 'content_blocks', 'content_text', 'status', 'visibility',
      'cover_asset_id', 'is_pinned', 'type'
    ]

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_edited_by: user.id,
    }
    for (const key of allowedFields) {
      if (key in body) patch[key] = body[key]
    }

    if (Array.isArray(body.content_blocks)) {
      patch.content_text = body.content_blocks
        .map((b: any) => b.content || '')
        .filter(Boolean)
        .join(' ')
        .slice(0, 3000)
      patch.content = patch.content_text
    }

    if (body.status === 'published') {
      const { data: existing } = await supabase
        .from('venture_updates')
        .select('status, published_at')
        .eq('id', id)
        .single()
      if (existing && existing.status === 'draft' && !existing.published_at) {
        patch.published_at = new Date().toISOString()
      }
    }
    if (body.status === 'archived') {
      patch.archived_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('venture_updates')
      .update(patch)
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select('*, author:users!created_by(id, full_name, username, avatar_url)')
      .single()

    if (error) throw error

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'update.edited',
        p_target_type: 'update',
        p_target_id: id,
        p_after: updated
      })
    } catch {}

    return NextResponse.json({ success: true, update: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 })
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
    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('venture_updates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('venture_id', venture.id)

    if (error) throw error

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'update.deleted',
        p_target_type: 'update',
        p_target_id: id
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}