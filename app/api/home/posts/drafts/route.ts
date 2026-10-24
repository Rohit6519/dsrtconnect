import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/home/posts/drafts
 * List user's drafts
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ drafts: [] })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  try {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_draft', true)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (id) {
      query = query.eq('id', id)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ drafts: data || [] })
  } catch (e: any) {
    return NextResponse.json({ drafts: [], error: e?.message }, { status: 500 })
  }
}

/**
 * POST /api/home/posts/drafts
 * Create or update a draft
 * Body: { id? (for update), ...post fields }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const draftId = body.id

  try {
    const payload: any = {
      user_id: user.id,
      publisher_type: body.publisher_type || 'person',
      publisher_id: body.publisher_id || user.id,
      type: body.type || 'update',
      title: body.title?.trim() || null,
      content: (body.content || body.content_text || '').trim() || null,
      content_text: body.content_text?.trim() || null,
      content_html: body.content_html || null,
      content_blocks: body.content_blocks || [],
      media_urls: body.media_urls?.length ? body.media_urls : null,
      image_urls: body.image_urls?.length ? body.image_urls : null,
      video_url: body.video_url || null,
      file_urls: body.file_urls || null,
      tags: body.tags?.length ? body.tags : null,
      visibility: body.visibility || 'global',
      comments_permission: body.comments_permission || 'everyone',
      is_draft: true,
      is_published_at: null,
    }

    if (body.publisher_type === 'venture') {
      payload.venture_id = body.publisher_id
    } else if (body.publisher_type === 'project') {
      payload.project_id = body.publisher_id
    }

    if (draftId) {
      const { data: existing } = await supabase.from('posts')
        .select('user_id, is_draft').eq('id', draftId).single()

      if (!existing || existing.user_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
      if (!existing.is_draft) {
        return NextResponse.json({ error: 'Cannot edit published post as draft' }, { status: 400 })
      }

      delete payload.user_id
      const { data, error } = await supabase.from('posts')
        .update(payload).eq('id', draftId).select().single()
      if (error) throw error
      return NextResponse.json({ draft: data })
    } else {
      const { data, error } = await supabase.from('posts')
        .insert(payload).select().single()
      if (error) throw error
      return NextResponse.json({ draft: data }, { status: 201 })
    }
  } catch (e: any) {
    console.error('Draft save error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

/**
 * DELETE /api/home/posts/drafts?id=<id>
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { data: existing } = await supabase.from('posts')
      .select('user_id, is_draft').eq('id', id).single()
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (!existing.is_draft) {
      return NextResponse.json({ error: 'Not a draft' }, { status: 400 })
    }

    await supabase.from('posts').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}