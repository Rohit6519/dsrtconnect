import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ventures/[slug]/media
 * Query params: type, featured, limit, offset
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const featuredOnly = searchParams.get('featured') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') || '48'), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id, show_in_explore')
      .eq('slug', slug)
      .maybeSingle()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    let isMember = false
    if (user) {
      const { data: memberCheck } = await supabase.rpc('is_venture_owner_or_member', {
        p_venture_id: venture.id,
        p_user_id: user.id
      })
      isMember = !!memberCheck
    }

    let query = supabase
      .from('venture_media_assets')
      .select('*, uploader:users!uploaded_by(id, full_name, username, avatar_url)', { count: 'exact' })
      .eq('venture_id', venture.id)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (!isMember) {
      query = query.eq('visibility', 'public')
    }

    if (type && type !== 'all') {
      query = query.eq('media_type', type)
    }

    if (featuredOnly) {
      query = query.eq('featured', true)
    }

    const { data: media, count, error } = await query.range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      media: media || [],
      total: count || 0,
      canEdit: isMember,
    })
  } catch (e: any) {
    console.error('List media error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to fetch media' }, { status: 500 })
  }
}

/**
 * POST /api/ventures/[slug]/media
 * Commits an uploaded asset (after direct storage upload)
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      public_url,
      storage_path,
      mime_type,
      file_size,
      media_type,
      title,
      description,
      alt_text,
      tags,
      visibility,
      featured,
      width,
      height,
      duration_seconds,
      crop_metadata,
    } = body

    if (!public_url || !storage_path || !mime_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get next position for this venture
    const { data: maxPos } = await supabase
      .from('venture_media_assets')
      .select('position')
      .eq('venture_id', venture.id)
      .is('deleted_at', null)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPosition = (maxPos?.position ?? -1) + 1

    const { data: asset, error: dbErr } = await supabase
      .from('venture_media_assets')
      .insert({
        venture_id: venture.id,
        storage_bucket: 'ventures',
        storage_path,
        asset_url: public_url,
        media_type: media_type || 'other',
        mime_type,
        file_size_bytes: file_size || 0,
        width: width || null,
        height: height || null,
        duration_seconds: duration_seconds || null,
        title: title || null,
        description: description || null,
        alt_text: alt_text || null,
        tags: tags || [],
        crop_metadata: crop_metadata || {},
        visibility: visibility || 'public',
        featured: !!featured,
        position: nextPosition,
        processing_status: 'ready',
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbErr) throw dbErr

    try {
      await supabase.rpc('fn_venture_audit', {
        p_venture_id: venture.id,
        p_action: 'media.uploaded',
        p_target_type: 'media',
        p_target_id: asset.id,
        p_after: asset
      })
    } catch {}

    try {
      await supabase.rpc('fn_venture_emit_event', {
        p_venture_id: venture.id,
        p_event_type: 'venture.media.created',
        p_aggregate_type: 'media',
        p_aggregate_id: asset.id,
        p_payload: { media_type, public_url }
      })
    } catch {}

    return NextResponse.json({ success: true, asset })
  } catch (e: any) {
    console.error('Media commit error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to commit' }, { status: 500 })
  }
}