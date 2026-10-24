import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const allowedFields = [
      'title', 'description', 'alt_text', 'tags', 'featured',
      'visibility', 'position', 'crop_metadata', 'variants', 'asset_url'
    ]

    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (key in body) patch[key] = body[key]
    }

    const { data: before } = await supabase
      .from('venture_media_assets')
      .select('*')
      .eq('id', id)
      .eq('venture_id', venture.id)
      .single()

    const { data: updated, error } = await supabase
      .from('venture_media_assets')
      .update(patch)
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'media.updated',
        p_target_type: 'media',
        p_target_id: id,
        p_before: before,
        p_after: updated
      })
    } catch {}

    try {
      await supabase.rpc('fn_venture_emit_event', {
        p_venture_id: venture.id,
        p_event_type: 'venture.media.updated',
        p_aggregate_type: 'media',
        p_aggregate_id: id,
        p_payload: {}
      })
    } catch {}

    return NextResponse.json({ success: true, asset: updated })
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
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Soft delete (30-day retention window)
    const { data: deleted, error } = await supabase
      .from('venture_media_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'media.deleted',
        p_target_type: 'media',
        p_target_id: id,
        p_before: deleted
      })
    } catch {}

    try {
      await supabase.rpc('fn_venture_emit_event', {
        p_venture_id: venture.id,
        p_event_type: 'venture.media.deleted',
        p_aggregate_type: 'media',
        p_aggregate_id: id,
        p_payload: {}
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}