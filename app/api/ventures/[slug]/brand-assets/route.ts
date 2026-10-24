import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/ventures/[slug]/brand-assets
 * Body: { kind: 'logo' | 'cover', public_url, storage_path, crop_metadata? }
 *
 * Commits the uploaded asset to the venture record.
 * Deletes old file from storage if replacing.
 * Emits outbox event for real-time sync.
 */

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id, logo_url, cover_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  const { data: isOwner } = await supabase.rpc('is_venture_owner_or_member', {
    p_venture_id: venture.id,
    p_user_id: user.id
  })

  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const { kind, public_url, storage_path, crop_metadata } = body

    if (!['logo', 'cover'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }
    if (!public_url) {
      return NextResponse.json({ error: 'Missing public_url' }, { status: 400 })
    }

    // ─── Build update patch ───
    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    
    if (kind === 'logo') {
      patch.logo_url = public_url
      if (crop_metadata) patch.logo_crop_metadata = crop_metadata
    } else {
      patch.cover_url = public_url
      if (crop_metadata) patch.cover_crop_metadata = crop_metadata
    }

    // ─── Update venture atomically ───
    const { data: updated, error: updateErr } = await supabase
      .from('ventures')
      .update(patch)
      .eq('id', venture.id)
      .select('id, logo_url, cover_url, logo_crop_metadata, cover_crop_metadata')
      .single()

    if (updateErr) throw updateErr

    // ─── Cleanup old file (non-blocking) ───
    const oldUrl = kind === 'logo' ? venture.logo_url : venture.cover_url
    if (oldUrl && oldUrl !== public_url) {
      const match = oldUrl.match(/\/storage\/v1\/object\/public\/ventures\/(.+)$/)
      if (match?.[1]) {
        const oldPath = decodeURIComponent(match[1])
        try {
          await supabase.storage.from('ventures').remove([oldPath])
        } catch (err) {
          console.error('Old file cleanup failed:', err)
        }
      }
    }

    // ─── Audit + Outbox for real-time sync ───
    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: `venture.${kind}.updated`,
        p_target_type: 'venture',
        p_target_id: venture.id,
        p_after: { [kind === 'logo' ? 'logo_url' : 'cover_url']: public_url }
      })
    } catch {}

    try {
      await supabase.rpc('fn_venture_emit_event', {
        p_venture_id: venture.id,
        p_event_type: `venture.${kind}.updated`,
        p_aggregate_type: 'venture',
        p_aggregate_id: venture.id,
        p_payload: { url: public_url, crop_metadata: crop_metadata || null }
      })
    } catch {}

    return NextResponse.json({ success: true, venture: updated })
  } catch (e: any) {
    console.error('Brand asset commit error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to update' }, { status: 500 })
  }
}

/**
 * DELETE /api/ventures/[slug]/brand-assets?kind=logo|cover
 * Removes the brand asset and deletes the file from storage.
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') as 'logo' | 'cover' | null

  if (!kind || !['logo', 'cover'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id, logo_url, cover_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: isOwner } = await supabase.rpc('is_venture_owner_or_member', {
    p_venture_id: venture.id,
    p_user_id: user.id
  })

  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const oldUrl = kind === 'logo' ? venture.logo_url : venture.cover_url

    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (kind === 'logo') {
      patch.logo_url = null
      patch.logo_crop_metadata = {}
    } else {
      patch.cover_url = null
      patch.cover_crop_metadata = {}
    }

    await supabase.from('ventures').update(patch).eq('id', venture.id)

    if (oldUrl) {
      const match = oldUrl.match(/\/storage\/v1\/object\/public\/ventures\/(.+)$/)
      if (match?.[1]) {
        const oldPath = decodeURIComponent(match[1])
        try {
          await supabase.storage.from('ventures').remove([oldPath])
        } catch {}
      }
    }

    try {
      await supabase.rpc('fn_venture_emit_event', {
        p_venture_id: venture.id,
        p_event_type: `venture.${kind}.removed`,
        p_aggregate_type: 'venture',
        p_aggregate_id: venture.id,
        p_payload: {}
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}